import AssetModel, { Asset } from "../models/asset";
import Directories from "../../storage/directories";
import fs from "fs";
import httpz from "@octanuary/httpz";
import info from "../data/voices.json";
import mp3Duration from "mp3-duration";
import path from "path";
import processVoice from "../models/tts";
import { randomBytes } from "crypto";
import { Readable } from "stream";

const group = new httpz.Group();

const voices = info.voices, langs = {};
Object.keys(voices).forEach((i) => {
	const v = voices[i], l = v.language;
	langs[l] = langs[l] || [];
	langs[l].push(`<voice id="${i}" desc="${v.desc}" sex="${v.gender}" demo-url="" country="${v.country}" plus="N"/>`);
});
const xml = `${process.env.XML_HEADER}<voices>${
	Object.keys(langs).sort().map(i => {
		const v = langs[i], l = info.languages[i];
		return `<language id="${i}" desc="${l}">${v.join("")}</language>`;
	}).join("")}</voices>`;

group.route("POST", "/goapi/getTextToSpeechVoices/", (req, res) => {
	res.setHeader("Content-Type", "text/html; charset=UTF-8");
	res.end(xml);
});

group.route("POST", "/goapi/convertTextToSoundAsset/", async (req, res) => {
	const { voice, text:rawText } = req.body;
	if (!voice || !rawText) {
		return res.status(400).end();
	}

	const filename = `${randomBytes(16).toString("hex")}.mp3`;
	const filepath = path.join(Directories.asset, filename);
	const writeStream = fs.createWriteStream(filepath);
	const text = rawText.substring(0, 320);
	processVoice(voice, text).then((data: any) => {
		return new Promise((resolve, reject) => {
			if (data instanceof Readable || (data && typeof data.on === 'function')) {
				data.pipe(writeStream);
			} else {
				writeStream.end(data);
			}

			writeStream.on("finish", resolve);
			writeStream.on("error", reject);
		});
	}).then(async () => {
		try {
			const duration = await mp3Duration(filepath) * 1e3;
			const meta: Partial<Asset> = {
				duration,
				type: "sound",
				subtype: "tts",
				title: `[${voices[voice].desc}] ${text}`
			};
			const id = await AssetModel.save(filepath, "mp3", meta);
			if (fs.existsSync(filepath)) {
				fs.unlinkSync(filepath);
			}
			res.end(`0<response><asset><id>${id}</id><enc_asset_id>${id}</enc_asset_id><type>sound</type><subtype>tts</subtype><title>${meta.title.replace(/&/g, "&amp;")}</title><published>0</published><tags></tags><duration>${meta.duration}</duration><downloadtype>progressive</downloadtype><file>${id}</file></asset></response>`);
		} catch (err) {
			console.error("TTS Post-processing error:", err);
			res.end(`1<error><code>ERR_ASSET_500</code><message>${err}</message></error>`);
		}
	}).catch((e: Error) => {
		console.error("Error generating TTS:", e);
		if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
		res.end(`1<error><code>ERR_ASSET_404</code><message>${e}</message><text></text></error>`);
	});
});

export default group;
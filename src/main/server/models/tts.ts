import brotli from "brotli";
import fileUtil from "../utils/fileUtil";
import https from "https";
import voiceList from "../data/voices.json";
import { Readable } from "stream";

/**
 * uses tts demos to generate tts
 * @param voiceName voice name
 * @param text text
 */
export default function processVoice(
	voiceName:string,
	text:string
): Promise<Buffer | Readable> {
	return new Promise(async (res, rej) => {
		const voice = voiceList.voices[voiceName];
		if (typeof voice == "undefined") {
			return rej("Requested voice is not supported");
		}

		try {
			switch (voice.source) {
				case "bing": {
					const req = https.request(
						{
							hostname: "lazypy.ro",
							path: "/tts/request_tts.php",
							method: "POST",
							headers: {
								"Content-type": "application/x-www-form-urlencoded"
							}
						},
						(r) => {
							let body = "";
							r.on("data", (b) => body += b);
							r.on("end", () => {
								const json = JSON.parse(body);
								console.log(JSON.stringify(json, undefined, 2))
								if (json.success !== true) {
									return rej(json.error_msg);
								}

								https.get(json.audio_url, (r) => {
								res(r);
								});							
							});
							r.on("error", rej);
						}
						
					).on("error", rej);
					req.end(
						new URLSearchParams({
							text: text,
							voice: voice.arg,
							service: "Bing Translator",
						}).toString()
					);
					break;
				}
				case "cepstral": {
					let pitch;
					if (flags.pitch) {
						pitch = +flags.pitch;
						pitch /= 100;
						pitch *= 4.6;
						pitch -= 0.4;
						pitch = Math.round(pitch * 10) / 10;
					} else {
						pitch = 1;
					}
					https.get("https://www.cepstral.com/en/demos", async (r) => {
						const cookie = r.headers["set-cookie"];
						const q = new URLSearchParams({
							voiceText: text,
							voice: voice.arg,
							createTime: 666,
							rate: 170,
							pitch: pitch,
							sfx: "none"
						}).toString();

						https.get(
							{
								hostname: "www.cepstral.com",
								path: `/demos/createAudio.php?${q}`,
								headers: { Cookie: cookie }
							},
							(r) => {
								let body = "";
								r.on("data", (b) => body += b);
								r.on("end", () => {
									const json = JSON.parse(body);

									https
										.get(`https://www.cepstral.com${json.mp3_loc}`, res)
										.on("error", rej);
								});
								r.on("error", rej);
							}
						).on("error", rej);
					}).on("error", rej);
					break;
				}
				case "polly2": {
					const body = new URLSearchParams({
						msg: text,
						lang: voice.arg,
						source: "ttsmp3"
					}).toString();

					const req = https.request(
						{
							hostname: "ttsmp3.com",
							path: "/makemp3_new.php",
							method: "POST",
							headers: { 
								"Content-Length": body.length,
								"Content-type": "application/x-www-form-urlencoded"
							}
						},
						(r) => {
							let body = "";
							r.on("data", (b) => body += b);
							r.on("end", () => {
								const json = JSON.parse(body);
								if (json.Error == 1) rej(json.Text);

								https
									.get(json.URL, res)
									.on("error", rej);
							});
							r.on("error", rej);
						}
					).on("error", rej);
					req.end(body);
					break;
				}
				case "pollyold": {
					const req = https.request(
						{
							hostname: "101.99.94.14",														
							path: voice.arg,
							method: "POST",
							headers: { 			
								Host: "tts.town",					
								"Content-Type": "application/x-www-form-urlencoded"
							}
						},
						(r) => {
							let buffers = [];
							r.on("data", (b) => buffers.push(b));
							r.on("end", () => {
								const html = Buffer.concat(buffers);
								const beg = html.indexOf("/tmp/");
								const end = html.indexOf("mp3", beg) + 3;
								const sub = html.subarray(beg, end).toString();
								//console.log(html.toString());

								https
									.get({
										hostname: "101.99.94.14",	
										path: `/${sub}`,
										headers: {
											Host: "tts.town"
										}
									}, res)
									.on("error", rej);
							});
						}
					).on("error", rej);
					req.end(
						new URLSearchParams({
							but1: text,
							butS: 0,
							butP: 0,
							butPauses: 0,
							but: "Submit",
						}).toString()
					);
					break;
				}
 				case "pollyold2": {
					const req = https.request(
                      {
						hostname: "support.readaloud.app",
						path: "/ttstool/createParts",
						method: "POST",
						headers: {
								"Content-Type": "application/json",
						},
					}, (r) => {
						let buffers = [];
						r.on("data", (d) => buffers.push(d)).on("error", rej).on("end", () => {
							https.get({
								hostname: "support.readaloud.app",
								path: `/ttstool/getParts?q=${JSON.parse(Buffer.concat(buffers))[0]}`,
								headers: {
									"Content-Type": "audio/mp3"
								}
							}, res).on("error", rej);
						});
					}).end(JSON.stringify([
						{
							voiceId: voice.arg,
							ssml: `<speak version="1.0" xml:lang="${voice.lang}">${text}</speak>`
						}
					])).on("error", rej);
					break;
				}
				case "vocalware": {
					const [EID, LID, VID] = voice.arg;
					const q = new URLSearchParams({
						EID,
						LID,
						VID,
						TXT: text,
						EXT: "mp3",
						FNAME: "",
						ACC: 15679,
						SceneID: 2703396,
						HTTP_ERR: "",
					}).toString();

					console.log(`https://cache-a.oddcast.com/tts/genB.php?${q}`)
					https
						.get(
							{
								hostname: "cache-a.oddcast.com",
								path: `/tts/genB.php?${q}`,
								headers: {
									"Host": "cache-a.oddcast.com",
									"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:107.0) Gecko/20100101 Firefox/107.0",
									"Accept": "*/*",
									"Accept-Language": "en-US,en;q=0.5",
									"Accept-Encoding": "gzip, deflate, br",
									"Origin": "https://www.oddcast.com",
									"DNT": 1,
									"Connection": "keep-alive",
									"Referer": "https://www.oddcast.com/",
									"Sec-Fetch-Dest": "empty",
									"Sec-Fetch-Mode": "cors",
									"Sec-Fetch-Site": "same-site"
								}
							}, res
						)
						.on("error", rej);
					break;
				}
				case "googletranslate": {
					const q = new URLSearchParams({
						ie: "UTF-8",
                        total: 1,
                        idx: 0,
                        client: "tw-ob",
                        q: text,
                        tl: voice.arg,
					}).toString();

					https
						.get(`https://translate.google.com/translate_tts?${q}`, res)
						.on("error", rej);
					break;
				}
 				case "cobaltspeech": {
					const q = new URLSearchParams({
						"text.text": text,
						"config.model_id": voice.lang,
						"config.speaker_id": voice.arg,
					    "config.speech_rate": 1,
						"config.variation_scale": 0,
						"config.audio_format.codec": "AUDIO_CODEC_WAV"
					}).toString();

					https.get({
						hostname: "demo.cobaltspeech.com",
						path: `/voicegen/api/voicegen/v1/streaming-synthesize?${q}`,
					}, (r) => fileUtil.convertToMp3(r, "wav").then(res).catch(rej)).on("error", rej);
					break;
				}
 				case "sapi4": {
					const q = new URLSearchParams({
						text,
						voice: voice.arg
					}).toString();

					https.get({
						hostname: "www.tetyys.com",
						path: `/SAPI4/SAPI4?${q}`,
					}, (r) => fileUtil.convertToMp3(r, "wav").then(res).catch(rej)).on("error", rej);
					break;
				}
 				case "onecore": {
					const req = https.request(
                      {
						hostname: "support.readaloud.app",
						path: "/ttstool/createParts",
						method: "POST",
						headers: {
								"Content-Type": "application/json",
						},
					}, (r) => {
						let buffers = [];
						r.on("data", (d) => buffers.push(d)).on("error", rej).on("end", () => {
							https.get({
								hostname: "support.readaloud.app",
								path: `/ttstool/getParts?q=${JSON.parse(Buffer.concat(buffers))[0]}`,
								headers: {
									"Content-Type": "audio/mp3"
								}
							}, res).on("error", rej);
						});
					}).end(JSON.stringify([
						{
							voiceId: voice.arg,
							ssml: `<speak version="1.0" xml:lang="${voice.lang}">${text}</speak>`
						}
					])).on("error", rej);
					break;
				}
				case "onecore2": {
					const q = new URLSearchParams({
						hl: voice.lang,
						c: "MP3",
                        f: "16khz_16bit_stereo",
                        v: voice.arg,
                        src: text,
					}).toString();

					https
						.get(`https://api.voicerss.org/?key=83baa990727f47a89160431e874a8823&${q}`, res)
						.on("error", rej);
					break;
				}
				case "svox": {
					const q = new URLSearchParams({
						speed: 0,
						apikey: "ispeech-listenbutton-betauserkey",
						text: text,
						action: "convert",
						voice: voice.arg,
						format: "mp3",
						e: "audio.mp3"
					}).toString();

					https
						.get(`https://api.ispeech.org/api/rest?${q}`, res)
						.on("error", rej);
					break;
				}
				case "neospeechold": {
					const q = new URLSearchParams({
						speed: 0,
						apikey: "38fcab81215eb701f711df929b793a89",
						text: text,
						action: "convert",
						voice: voice.arg,
						format: "mp3",
						e: "audio.mp3"
					}).toString();

					https
						.get(`https://api.ispeech.org/api/rest?${q}`, res)
						.on("error", rej);
					break;
				}
				case "youdao": {
					const q = new URLSearchParams({
						audio: text,
						le: voice.arg,
						type: voice.type
					}).toString();

					https
						.get(`https://dict.youdao.com/dictvoice?${q}`, res)
						.on("error", rej);
					break;
				}
				case "baidu": {
					const q = new URLSearchParams({
						lan: voice.arg,
						text: text,
						spd: "5",
						source: "web",
					}).toString();

					https
						.get(`https://fanyi.baidu.com/gettts?${q}`, res)
						.on("error", rej);
					break;
				}
				case "tiktok": {
					const req = https.request(
						{
							hostname: "lazypy.ro",
							path: "/tts/request_tts.php",
							method: "POST",
							headers: {
								"Content-type": "application/x-www-form-urlencoded"
							}
						},
						(r) => {
							let body = "";
							r.on("data", (b) => body += b);
							r.on("end", () => {
								const json = JSON.parse(body);
								console.log(JSON.stringify(json, undefined, 2))
								if (json.success !== true) {
									return rej(json.error_msg);
								}

								https.get(json.audio_url, (r) => {
								res(r);
								});							
							});
							r.on("error", rej);
						}
						
					).on("error", rej);
					req.end(
						new URLSearchParams({
							text: text,
							voice: voice.arg,
							service: "TikTok",
						}).toString()
					);
					break;
				}
	
				default: {
					return rej("Not implemented");
				}
			}
		} catch (e) {
			return rej(e);
		}
	});
};

/**
 * converts the waaa's to make it sound old (voicehub method)
 * @param text text input
 * @param voiceArg voice argument
 */
async function convertVoiceforgeText(
	text:string,
	voiceArg:string
): Promise<string> {
	return new Promise((resolve) => {
		let inputText = text.toLowerCase();
		// still gotta thank Jyvee for the actual method
		// theres also a reason why Jyvee randomly shared the method but its a personal reason
		if (!inputText.includes("aaaaa")) {
			return resolve(text);
		}
		let pattern = /(?:gr|[a-z])a{2,}([a-z]?)/g;
		let question = /\?/g;
		let matches = inputText.match(pattern);
		for (const match of matches) {
			let voiceValues = ["aa"];
			const initialChar = match.charAt(0);
			switch (initialChar) {
				case "a": {
					voiceValues.pop();
					voiceValues.unshift("a1");
					voiceValues.unshift("ah");
					break;
				}
				case "c": {
					voiceValues.unshift("k");
					break;
				}
				case "j": {
					voiceValues.unshift("jh");
					break;
				}
				case "u": {
					voiceValues.unshift("uh1");
					break;
				}
				case "v": {
					voiceValues.unshift("v1");
					break;
				}
				case "w": {
					if (voiceArg == "Dallas") {
						voiceValues.unshift("w");
					}
					else {
						voiceValues.unshift("w1");
					}
					break;
				}
				case "x": {
					voiceValues.unshift("eh1");
					voiceValues.unshift("z");
					break;
				}
				case "y": {
					voiceValues.unshift("a");
					voiceValues.unshift("j");
					break;
				}
				case "z": {
					voiceValues.unshift("aa1");
					voiceValues.unshift("z");
					break;
				}
				default: {
					if (match.startsWith("gr")) {
						if (voiceArg == "French-fry") {
							voiceValues.pop();
							voiceValues.unshift("r")
							voiceValues.unshift("g1")
						}
						else {
							voiceValues.pop();
							voiceValues.unshift("r");
							voiceValues.unshift("g");
						}
						break;
					} else if (match.includes("ga")) {
						voiceValues.unshift("g1");
						break;
					}
					voiceValues.unshift(initialChar);
				}
			}
			let consecutiveAs = match.length - 1;
			for (let i = 0; i < consecutiveAs; i++) {
				voiceValues.push("ah");
			}
			if (!match.includes("ah") && match.charAt(0) != "a" && !match.includes("ay")) {
				switch (voiceArg) {
					case "Belle":
					case "Charlie":
					case "Designer":
					case "Duchess": 
					case "Evilgenius":
					case "Frank":
					case "French-fry":
					case "Jerkface":
					case "JerseyGirl":
					case "Kayla":
					case "Kevin":
					case "Susan":
					case "Tamika":
					case "TopHat":
					case "Vixen":
					case "Vlad":
					case "Warren": {
						voiceValues.push("aa1");
						voiceValues.push("a");
						break;
					}
					case "Conrad":
					case "Wiseguy": {
						voiceValues.push("aa1");
						voiceValues.push("aa1");
						break;
					}
					case "Kidaroo": {
						voiceValues.push("aa");
						voiceValues.push("ah");
						break;
					}
					case "Zach": {
						voiceValues.push("aa1");
						voiceValues.push("aa");
						break;
					}
					case "RansomNote": {
						voiceValues.push("aa");
						voiceValues.push("aa");
						voiceValues.push("ay");
						break;
					}
					case "Gregory": {
						voiceValues.push("a1");
						voiceValues.push("aa");
						break;
					}
					case "Diesel":
					case "Princess": {
						voiceValues.push("aa1");
						voiceValues.push("a");
						break;
					}
					case "Dallas": {
						voiceValues.push("ah1");
						break;
					}
					default: {
						voiceValues.push("ah");
						voiceValues.push("a");
					}
				}
				if (match == "h") {
					if (voiceArg == "RansomNote") {
						voiceValues.pop();
						voiceValues.pop();
						voiceValues.pop();
					}
					else {
						voiceValues.pop();
						voiceValues.pop();
					}
					voiceValues.push("aa1");
					if (voiceArg == "Dallas") {
						voiceValues.pop();
					}
				}
			}
			else if (match.includes("ay")) {
				voiceValues.push("ey1");
				voiceValues.push("ey1");
			}
			else if (match.includes("ah")) {
				switch (voiceArg) {
					case "Frank":
					case "Kayla": {
						voiceValues.push("ah1");
						voiceValues.push("a");
						voiceValues.push("ah");
						break;
					}
					case "Belle": {
						voiceValues.push("aa1");
						voiceValues.push("ah");
						break;
					}
					case "Designer": {
						voiceValues.push("ah");
						voiceValues.push("a");
						voiceValues.push("ah");
						break;
					}
					default: {
						voiceValues.push("aa");
						voiceValues.push("ah");
					}
				}
			}
			else {
				return resolve(text);
			}
			let xmlText = `<phoneme ph="${voiceValues.join(" ")}">Cepstral</phoneme>`;
			let modifiedText = inputText.replace(match, xmlText);
			let modifiedExclimation = modifiedText.replace("!", "! ,");
			let modifiedQuestion = modifiedExclimation.replace(question, "? ,");
			let modifiedComma = modifiedQuestion.replace(",", ", ;");
			let modifiedPeriod = modifiedComma.replace(".", ". ,");
			text = modifiedPeriod;
			return resolve(text);
		}
	})
}

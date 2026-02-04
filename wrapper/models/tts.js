const brotli = require("brotli");
const https = require("https");
const voices = require("../data/voices.json").voices;
const fileUtil = require("../../utils/realFileUtil");

module.exports = function processVoice(voiceName, rawText) {
	return new Promise(async (res, rej) => {
		const voice = voices[voiceName];
		if (!voice) {
			rej("The voice you requested is unavailable.");
		}

		let flags = {};
		const pieces = rawText.split("#%");
		let text = pieces.pop().substring(0, 300);
		for (const rawFlag of pieces) {
			const index = rawFlag.indexOf("=");
			if (index == -1) continue;
			const name = rawFlag.substring(0, index);
			const value = rawFlag.substring(index + 1);
			flags[name] = value;
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
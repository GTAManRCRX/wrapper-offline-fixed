import Directories from "../../storage/directories.ts";
import fs from "fs";
import path from "path";

export default class WaveformModel {
	static folder = Directories.cache;

	static load(id:string) {
		const filepath = path.join(this.folder, id + ".wf");
		const exists = fs.existsSync(filepath);
		if (!exists) {
			return null;
		}
		return fs.readFileSync(filepath);
	}

	static save(wf:Buffer, id:string) {
		fs.writeFileSync(path.join(this.folder, id + ".wf"), wf);
		console.log(`${id}.wf saved successfully`);
	}
};
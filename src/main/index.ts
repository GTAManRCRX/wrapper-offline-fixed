const env = Object.assign(process.env, require("../../env.json"), require("../../config.json"));

import { app, BrowserWindow, Menu, shell, ipcMain } from "electron";
import { createWriteStream } from "fs";
import Directories from "./storage/directories";
import { join } from "path";
import settings from "./storage/settings";
import { startAll } from "./server/index";

const customTempPath = join(__dirname, "temp");
app.setPath("userData", customTempPath);

const IS_DEV = app.commandLine.getSwitchValue("dev").length > 0;

startAll();

if (settings.saveLogFiles) {
	const filePath = join(Directories.log, new Date().valueOf() + ".txt");
	const writeStream = createWriteStream(filePath);
	console.log = console.error = console.warn = function (c) {
		writeStream.write(c + "\n");
		process.stdout.write(c + "\n");
	};
	process.on("exit", () => {
		console.log("Exiting...");
		writeStream.close();
	});
}

let pluginName:string;
switch (process.platform) {
	case "win32": {
		pluginName = "extensions/pepflashplayer.dll";
		break;
	}
	case "darwin": {
		pluginName = "extensions/PepperFlashPlayer.plugin";
		break;
	}
	case "linux": {
		pluginName = "extensions/libpepflashplayer.so";
		app.commandLine.appendSwitch("no-sandbox");
		break;
	}
	default: {
		throw new Error("You are running Wrapper offline on an unsupported platform.");
	}
}
app.commandLine.appendSwitch("ppapi-flash-path", join(__dirname, pluginName));
app.commandLine.appendSwitch("ppapi-flash-version", "34.0.0.137");

app.commandLine.appendSwitch("disable-http-cache");

let mainWindow:BrowserWindow;
let root:string;
const createWindow = () => {

	let iconPath: string;

		if (process.platform === 'win32') {
    			iconPath = join(__dirname, 'favicon.ico');
		} else if (process.platform === 'darwin') {
    			iconPath = join(__dirname, 'favicon.icns');
		} else {
    			iconPath = join(__dirname, 'favicon.png');
		}

	mainWindow = new BrowserWindow({
		width: 1280,
		height: 720,
		title: "Wrapper offline",
		show: false,
		icon: iconPath,
		webPreferences: {
			preload: join(__dirname, "preload.js"),
			plugins: true,
			contextIsolation: true
		}
	});
	setMenuBar(mainWindow);

	ipcMain.on("exit", () => process.exit(0));
	ipcMain.on("open-discord", openDiscord);
	ipcMain.on("open-faq", openFaq);
	ipcMain.on("open-github", openGitHub);
	ipcMain.on("open-data-folder", openDataFolder);

	let host:string, port:string;
	if (IS_DEV) {
		host = app.commandLine.getSwitchValue("host");
		port = app.commandLine.getSwitchValue("port");
	} else {
		host = process.env.API_SERVER_HOST;
		port = process.env.API_SERVER_PORT;
	}
	root = `${host}:${port}`;
	mainWindow.loadURL(root);
	mainWindow.maximize();
    	mainWindow.show();
	mainWindow.on("closed", () => process.exit(0));
};

async function openDiscord() {
	await shell.openExternal("https://discord.gg/Kf7BzSw");
}
async function openFaq() {
	await shell.openExternal("https://github.com/wrapper-offline/wrapper-offline/wiki/FAQ");
}
async function openGitHub() {
	await shell.openExternal("https://github.com/wrapper-offline/wrapper-offline");
}
async function openDataFolder() {
	await shell.openPath(Directories.userData);
}

app.whenReady().then(() => {
	setTimeout(createWindow, 2000);

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
	
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

function setMenuBar(mainWindow:BrowserWindow) {
	mainWindow.setAutoHideMenuBar(settings.hideNavbar);
	Menu.setApplicationMenu(Menu.buildFromTemplate([
		{
			label: "Home",
			click: () => {
				mainWindow.loadURL(root);
			}
		},
		{
			label: "View",
			submenu: [
				{ type: "separator" },
				{ role: "zoomIn" },
				{ role: "zoomOut" },
				{ role: "resetZoom" },
				{ type: "separator" },
				{ role: "toggleDevTools" },
				{ role: "reload" },
				{ role: "forceReload" },
				{ type: "separator" },
				{ role: "minimize" },
				...(process.platform == "darwin" ? 
					[
						{ role: "front" },
						{ type: "separator" },
						{ role: "window" }
					] as ({ role: "front" } |
						{ type: "separator" } |
						{ role: "window" })[] : 
					[
						{ role: "close" } as { role: "close" }
					]),
			]
		},
		{
			role: "help",
			submenu: [
				{
					label: "Discord",
					click: openDiscord
				},
				{
					label: "FAQ",
					click: openFaq
				},
				{
					label: "GitHub",
					click: openGitHub
				}
			]
		}
	]));
}
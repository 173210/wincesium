/*  Copyright (C) 2016  173210 <root.3.173210@live.com>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>. */

const app = require("app");
const Window = require("browser-window");

// Keep a reference of the window object to prevent garbage collector from
// closing it.
let window;

app.on('ready', function() {
	window = new Window();

	window.loadURL('file://' + __dirname + '/viewer.html');

	window.on('closed', function() {
		window = null;
	});

});

// On darwin, applications will be closed automatically.
app.on('window-all-closed', function() {
	if (process.platform != 'darwin')
		app.quit();
});

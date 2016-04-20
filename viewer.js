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

"use strict";

class Downloader {
	constructor() {
		this.http = require("http");
		this.querystring = require("querystring");
	}

	download(callback) {
		const body = this.querystring.stringify({
			"DB": "dat", "ACTION": "DOEQINFO", "ID": "GUEST",
			"YR1": "2016", "MO1": "04", "DY1": "15", "HR1": "16", "MI1": "26",
			"YR2": "2016", "MO2": "04", "DY2": "18", "HR2": "16", "MI2": "26",
			"MAG1": "1.0", "MAG2": "9.9", "DEP1": "-10.0", "DEP2": "700.0"
		});

		const request = this.http.request({
			hostname: "kyupub.sevo.kyushu-u.ac.jp", port: 80,
			path: "/win-cgi/harvest.pl", method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded",
				"Content-Length": body.length
			}
		}, callback);

		request.on("error", function(event) {
			alert(event.message);
		});

		request.write(body);
		request.end();
	}
}

class Globe {
	constructor() {
		Cesium.BingMapsApi.defaultKey = BING_KEY;
		this.viewer = new Cesium.Viewer("cesiumContainer");
		this.source = new Cesium.CustomDataSource("epicenters");
		this.viewer.dataSources.add(this.source);
	}

	addEarthquake(longitude, latitude, height, description) {
		const color = Cesium.Color.fromHsl((1 - height) * 0.6, 1.0, 0.5);

		const surfacePosition = Cesium.Cartesian3.fromDegrees(longitude, latitude, 0);
		const heightPosition = Cesium.Cartesian3.fromDegrees(longitude, latitude, height * 65536);

		const polyline = new Cesium.PolylineGraphics();
		polyline.material = new Cesium.ColorMaterialProperty(color);
		polyline.width = new Cesium.ConstantProperty(2);
		polyline.followSurface = new Cesium.ConstantProperty(false);
		polyline.positions = new Cesium.ConstantProperty([surfacePosition, heightPosition]);

		const entity = new Cesium.Entity({
			id: this.source.entities.values.length + ": " + description,
			show: true,
			polyline: polyline,
			seriesName: "Magnitude"
		});

		this.source.entities.add(entity);
	}
}

function ParserEventHandler(callback) {
	const object = this;

	object.stage = 0;
	object.record = null;
	object.td = false;
	object.handlers = {
		onopentag: function(name) {
			if (object.stage < 3) {
				if (name == "table")
					object.stage++;
			} else if (object.stage == 3) {
				if (name == "tr") {
					object.stage++;
				}
			} else if (object.stage == 5) {
				switch (name) {
				case "tr":
					object.record = [];
					break;

				case "td":
					if (object.record == null)
						throw new Cesium.RuntimeError("Unexpected table data");

					object.td = true;
					break;
				}
			}
		},
		ontext: function(text) {
			if (object.record && object.td)
				object.record.push(text);
		},
		onclosetag: function(name) {
			if (object.stage == 3) {
				if (name == "table")
					throw new Cesium.RuntimeError("Unexpected end of table");
			} else if (object.stage == 4) {
				switch (name) {
				case "table":
					throw new Cesium.RuntimeError("Unexpected end of table");

				case "tr":
					object.stage++;
					break;
				}
			} else if (object.stage == 5) {
				switch (name) {
				case "table":
					object.stage++;
				break;

				case "tr":
					if (object.record == null)
						throw new Cesium.RuntimeError("Unexpected end of table record");

					callback(object.record);
					object.record = null;
					break;

				case "td":
					if (!object.td)
						throw new Cesium.RuntimeError("Unexpected end of table data");

					object.td = false;
					break;
				}
			}
		}
	};
}

const globe = new Globe();
const parserEventHandler = new ParserEventHandler(function(record) {
	const latitude = parseFloat(record[6]);
	const longitude = parseFloat(record[7]);
	const magnitude = parseFloat(record[9]);
	const height = magnitude / 8;
	globe.addEarthquake(longitude, latitude, height, "M" + magnitude);
});

const htmlparser2 = require("htmlparser2");
const parser = new htmlparser2.Parser(parserEventHandler.handlers);
const downloader = new Downloader();

downloader.download(function(response) {
	response.on("data", function(chunk) {
		parser.write(String.fromCharCode.apply(null, chunk));
	});

	response.on("end", function() {
		parser.end();
	});
});

const shell = require('electron').shell;
document.getElementById("source").onclick = function() {
	shell.openExternal("http://kyupub.sevo.kyushu-u.ac.jp/harvest/");
}

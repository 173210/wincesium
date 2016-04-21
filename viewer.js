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

	download(start, end, callback) {
		const body = this.querystring.stringify({
			"DB": "dat", "ACTION": "DOEQINFO", "ID": "GUEST",

			"YR1": start.getFullYear(), "MO1": start.getMonth() + 1,
			"DY1": start.getDate(), "HR1": start.getHours(),
			"MI1": start.getMinutes(),

			"YR2": end.getFullYear(), "MO2": end.getMonth() + 1,
			"DY2": end.getDate(), "HR2": end.getHours(),
			"MI2": end.getMinutes(),

			"MAG1": "1.0", "MAG2": "9.9",
			"DEP1": "-10.0", "DEP2": "700.0"
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
		this.viewer.camera.flyTo({ destination:
			Cesium.Cartesian3.fromDegrees(131, 33, 1048576) });
		this.source = new Cesium.CustomDataSource("epicenters");
		this.viewer.dataSources.add(this.source);
		this._typeToShow = "depth";
	}

	removeAllEarthquake() {
		this.source.entities.removeAll();
	}

	addEarthquake(longitude, latitude, depth, magnitude) {
		function getColor(value, max) {
			return new Cesium.ColorMaterialProperty(
				Cesium.Color.fromHsl((1 - value / max) * 0.6, 1.0, 0.5));
		}

		function getPosition(height) {
			return Cesium.Cartesian3.fromDegrees(
				longitude, latitude, height);
		}

		const surfacePosition = getPosition(0);

		const width = new Cesium.ConstantProperty(2);
		const followSurface = new Cesium.ConstantProperty(false);
		const entities = this.source.entities;
		const description = (entities.values.length - 1) / 2
			+ ": M" + magnitude;
		const typeToShow = this._typeToShow;

		function addPolyline(type, color, surface, top) {
			const polyline = new Cesium.PolylineGraphics();
			polyline.material = color;
			polyline.width = width;
			polyline.followSurface = followSurface;
			polyline.positions = new Cesium.ConstantProperty([surface, top]);

			const entity = new Cesium.Entity({
				id: description + " (" + type + ")",
				show: type == typeToShow,
				polyline: polyline,
				type: type
			});

			entities.add(entity);
		}

		if (depth > 0) {
			const depthColor = getColor(Math.log(depth), 2);
			const depthPosition = getPosition(depth * 1000);

			addPolyline("depth", depthColor,
				surfacePosition, depthPosition);
		}

		const magnitudeColor = getColor(magnitude, 8);
		const magnitudePosition = getPosition(magnitude * 65536);
		addPolyline("magnitude", magnitudeColor,
			surfacePosition, magnitudePosition);
	}

	get typeToShow() {
		return this._typeToShow;
	}

	set typeToShow(type) {
		this._typeToShow = type;

		const entities = this.source.entities;
		entities.suspendEvents();
		for (let index = 0; index < entities.values.length; index++) {
			const entity = entities.values[index];
			entity.show = entity.type == type;
		}
		entities.resumeEvents();
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

const htmlparser2 = require("htmlparser2");
const downloader = new Downloader();

function initializeData(start, end) {
	const parserEventHandler = new ParserEventHandler(function(record) {
		const latitude = parseFloat(record[6]);
		const longitude = parseFloat(record[7]);
		const depth = parseFloat(record[8]);
		const magnitude = parseFloat(record[9]);
		globe.addEarthquake(longitude, latitude, depth, magnitude);
	});

	const parser = new htmlparser2.Parser(parserEventHandler.handlers);

	downloader.download(start, end, function(response) {
		response.on("data", function(chunk) {
			parser.write(String.fromCharCode.apply(null, chunk));
		});

		response.on("end", function() {
			parser.end();
		});
	});
}

const end = new Date(Date.now());
end.setMilliseconds(0);
end.setSeconds(0);
const start = new Date(end.getTime());
start.setDate(start.getDate() - 7);
initializeData(start, end);

document.getElementById("start-date").valueAsDate = start;
document.getElementById("start-time").valueAsDate = start;
document.getElementById("end-date").valueAsDate = end;
document.getElementById("end-time").valueAsDate = end;

document.getElementById("magnitude").onclick = function() {
	globe.typeToShow = "magnitude";
}

document.getElementById("depth").onclick = function() {
	globe.typeToShow = "depth";
}

document.getElementById("get").onclick = function() {
	function getDatetime(date, time) {
		function getMilliseconds(id) {
			return document.getElementById(id).valueAsDate.getTime();
		}

		return new Date(getMilliseconds(date) + getMilliseconds(time));
	}

	globe.removeAllEarthquake();
	initializeData(getDatetime("start-date", "start-time"),
		getDatetime("end-date", "end-time"));
}

const shell = require('electron').shell;
document.getElementById("source").onclick = function() {
	shell.openExternal("http://kyupub.sevo.kyushu-u.ac.jp/harvest/");
}

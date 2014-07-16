(function () {

function ProceduralTerrain(options){
	var height_map = [];
	var temperature_map = [];
	var precipitation_map = [];

	var height_map_simplex = new SimplexNoise();
	var precipitation_map_simplex = new SimplexNoise();
	var temperature_map_simplex = new SimplexNoise();

	var pt_height = options.height || 50;
	var pt_width = options.width || 50;

	var pt_continent_factor = options.continent_factor || 2;

	var height_map_granularity = options.height_map_granularity || 0.1;
	var precipitation_map_granularity = options.precipitation_map_granularity || 0.1;
	var temperature_map_granularity = options.temperature_map_granularity || 0.1;

	var height_map_simplex_step = 0;
	var precipitation_map_simplex_step = 0;
	var temperature_map_simplex_step = 0;

	var time_step_modifier = options.time_step_modifier || 100;

	var pt_details = options.details || 10;
	if (pt_details > 79) pt_details = 79;

	this.generateHeightMap = function(granularity){
		if (!granularity) granularity = 0.3;
		height_map = [];
		for (var i = 0; i < pt_height; i++) {
			height_map.push([]);
			for (var j = 0; j < pt_width; j++) {
				var temp_height = Math.floor((height_map_simplex.noise3D(i / (granularity * pt_height), j / (granularity * pt_width), height_map_simplex_step / time_step_modifier ) * pt_details + pt_details) / pt_continent_factor);
				var random_modifier = Math.random() * pt_details * 0.03;
				height_map[i].push( Math.min(pt_details - 1, Math.max(0, Math.floor(temp_height + random_modifier))) );
			};
		};
		return this;
	};

	this.evolveHeight = function(){
		height_map_simplex_step += 1;
		return this;
	}

	this.getHeightMap = function(format){
		if (format == 'text') return convertToTextDisplay(height_map);
		return height_map;
	}

	this.generatePrecipitationMap = function(granularity){
		if (!granularity) granularity = 0.3;
		precipitation_map = [];
		for (var i = 0; i < pt_height; i++) {
			precipitation_map.push([]);
			for (var j = 0; j < pt_width; j++) {
				var temp_precipitation = Math.floor((precipitation_map_simplex.noise3D(i / (granularity * pt_height), j / (granularity * pt_width), precipitation_map_simplex_step / time_step_modifier ) * pt_details + pt_details) / 2);
				var random_modifier = Math.random() * pt_details * 0.05;
				precipitation_map[i].push( Math.min(pt_details - 1, Math.max(0, Math.floor(temp_precipitation + random_modifier))) );
			};
		};
		return this;
	};

	this.evolvePrecipitation = function(){
		precipitation_map_simplex_step += 1;
		return this;
	}

	this.getPrecipitationMap = function(format){
		if (format == 'text') return convertToTextDisplay(precipitation_map);
		return precipitation_map;
	}

	this.generateTemperatureMap = function(granularity){
		if (!granularity) granularity = 0.3;
		temperature_map = [];
		for (var i = 0; i < pt_height; i++) {
			temperature_map.push([]);
			for (var j = 0; j < pt_width; j++) {

				var temp_normal = Math.floor( ((i / pt_height ) * (pt_details * 2)));
				var pt_offset = temp_normal - pt_details;
				if (pt_offset > -1) temp_normal = temp_normal - (temp_normal + pt_offset) + pt_details - 1;

				var temperature_simplex_modifier = Math.floor((temperature_map_simplex.noise3D(i / (temperature_map_granularity * pt_height), j / (temperature_map_granularity * pt_width), temperature_map_simplex_step / time_step_modifier ) * pt_details) / 2);
				temperature_simplex_modifier = Math.floor((temperature_simplex_modifier / pt_details) * (pt_details / 3));

				var random_modifier = Math.random() * pt_details * 0.05;

				temperature_map[i].push(Math.min(Math.max(temp_normal + temperature_simplex_modifier + random_modifier, 0), pt_details - 1));
			};
		};
		return this;
	};

	this.evolveTemperature = function(){
		temperature_map_simplex_step += 1;
		return this;
	}

	this.getTemperatureMap = function(format){
		if (format == 'text') return convertToTextDisplay(temperature_map);
		// if (format == 'text') return convertToTextDisplay(temperature_map, ['#4d71c8', '#c82530']);
		return temperature_map;
	}

	function convertToTextDisplay(tempmap){
		var display = '';
		for (var i = 0; i < pt_height; i++) {
			for (var j = 0; j < pt_width; j++) {
				display += String.fromCharCode(48 + tempmap[i][j]).replace('<', '#').replace('>', '$');
			};
			display += '<br />';
		};
		return display;
	}

	this.generateMaps = function(granularity){
		this.generateHeightMap(granularity);
		this.generatePrecipitationMap(granularity);
		this.generateTemperatureMap(granularity);
		return this;
	}

	this.compileTerrain = function(options, callback){
		if (!temperature_map.length || !precipitation_map.length || !height_map.length) return callback('You must first generate a height, temperature, and precipitation map', null);
		var water_level = Math.floor(options.water_level || pt_details * 0.4);
		var snow_level = Math.floor(options.snow_level || pt_details - (pt_details / 14));
		var rock_level = Math.floor(options.rock_level || pt_details - (pt_details / 6));
		var forest_level = Math.floor(options.forest_level || pt_details - (pt_details / 3.5));
		var cold = options.cold || pt_details * 0.3;
		var hot = options.hot || pt_details * 0.7;
		var wet = options.wet || pt_details * 0.3;
		var dry = options.dry || pt_details * 0.7;

		var rock_char = '≏';
		var deep_water_char = '≋';
		var shallow_water_char = '≈';
		var ice_char = '≡';
		var snow_char = '≐';
		var sand_char = '∻';
		var boreal_char = '▓';
		var tundra_char = '≒';
		var savanna_char = '▒';
		var prairie_char = '░';
		var forest_char = '∗';
		var rain_forest_char = '≼';
		var tropical_rain_forest_char = '≿';

		var output_2d_map = [];

		for (var i = 0; i < pt_height; i++) {
			output_2d_map.push([]);
			for (var j = 0; j < pt_width; j++) {
				//water:
				if (height_map[i][j] < water_level) {
					output_2d_map[i].push(deep_water_char);
				//shallows:
				} else if (height_map[i][j] < water_level * 1.1) {
					output_2d_map[i].push(shallow_water_char);
				//sandy beaches:
				} else if (height_map[i][j] < water_level * 1.2) {
					output_2d_map[i].push(sand_char);
				//snow caps:
				} else if (height_map[i][j] > snow_level && temperature_map[i][j] <= hot) {
					output_2d_map[i].push(snow_char);
				//rocky mountains:
				} else if (height_map[i][j] > rock_level) {
					output_2d_map[i].push(rock_char);
				//foresty hills:
				} else if (height_map[i][j] > forest_level && temperature_map[i][j] <= hot && temperature_map[i][j] >= cold) {
					output_2d_map[i].push(forest_char);
				//biomes:
				} else {
					//cold:
					if (temperature_map[i][j] <= cold){
						//wet
						if (precipitation_map[i][j] <= wet){
							//polar
							output_2d_map[i].push(ice_char);
						//dry:
						} else if (precipitation_map[i][j] >= dry){
							//tundra
							output_2d_map[i].push(tundra_char);
						//moderate:
						} else {
							//boreal
							output_2d_map[i].push(boreal_char);
						}
					//hot:
					} else if (temperature_map[i][j] >= hot){
						//wet
						if (precipitation_map[i][j] <= wet){
							//tropical rain forest
							output_2d_map[i].push(tropical_rain_forest_char);
						//dry:
						} else if (precipitation_map[i][j] >= dry){
							//desert
							output_2d_map[i].push(sand_char);
						//moderate:
						} else {
							//savanna
							output_2d_map[i].push(savanna_char);
						}
					//moderate:
					} else {
						//wet
						if (precipitation_map[i][j] <= wet){
							//rain forest
							output_2d_map[i].push(rain_forest_char);
						//dry:
						} else if (precipitation_map[i][j] >= dry){
							//forest
							output_2d_map[i].push(forest_char);
						//moderate:
						} else {
							//prairie
							output_2d_map[i].push(prairie_char);
						}
					}
				}
			}
		}
		callback(null, output_2d_map);
	}
}


/* From this point down:
 * A fast javascript implementation of simplex noise by Jonas Wagner
 *
 * Based on a speed-improved simplex noise algorithm for 2D, 3D and 4D in Java.
 * Which is based on example code by Stefan Gustavson (stegu@itn.liu.se).
 * With Optimisations by Peter Eastman (peastman@drizzle.stanford.edu).
 * Better rank ordering method by Stefan Gustavson in 2012.
 *
 *
 * Copyright (C) 2012 Jonas Wagner
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */


var F2 = 0.5 * (Math.sqrt(3.0) - 1.0),
	G2 = (3.0 - Math.sqrt(3.0)) / 6.0,
	F3 = 1.0 / 3.0,
	G3 = 1.0 / 6.0,
	F4 = (Math.sqrt(5.0) - 1.0) / 4.0,
	G4 = (5.0 - Math.sqrt(5.0)) / 20.0;


function SimplexNoise(random) {
	if (!random) random = Math.random;
	this.p = new Uint8Array(256);
	this.perm = new Uint8Array(512);
	this.permMod12 = new Uint8Array(512);
	for (var i = 0; i < 256; i++) {
		this.p[i] = random() * 256;
	}
	for (i = 0; i < 512; i++) {
		this.perm[i] = this.p[i & 255];
		this.permMod12[i] = this.perm[i] % 12;
	}

}
SimplexNoise.prototype = {
	grad3: new Float32Array([1, 1, 0,
							- 1, 1, 0,
							1, - 1, 0,

							- 1, - 1, 0,
							1, 0, 1,
							- 1, 0, 1,

							1, 0, - 1,
							- 1, 0, - 1,
							0, 1, 1,

							0, - 1, 1,
							0, 1, - 1,
							0, - 1, - 1]),
	grad4: new Float32Array([0, 1, 1, 1, 0, 1, 1, - 1, 0, 1, - 1, 1, 0, 1, - 1, - 1,
							0, - 1, 1, 1, 0, - 1, 1, - 1, 0, - 1, - 1, 1, 0, - 1, - 1, - 1,
							1, 0, 1, 1, 1, 0, 1, - 1, 1, 0, - 1, 1, 1, 0, - 1, - 1,
							- 1, 0, 1, 1, - 1, 0, 1, - 1, - 1, 0, - 1, 1, - 1, 0, - 1, - 1,
							1, 1, 0, 1, 1, 1, 0, - 1, 1, - 1, 0, 1, 1, - 1, 0, - 1,
							- 1, 1, 0, 1, - 1, 1, 0, - 1, - 1, - 1, 0, 1, - 1, - 1, 0, - 1,
							1, 1, 1, 0, 1, 1, - 1, 0, 1, - 1, 1, 0, 1, - 1, - 1, 0,
							- 1, 1, 1, 0, - 1, 1, - 1, 0, - 1, - 1, 1, 0, - 1, - 1, - 1, 0]),
	noise2D: function (xin, yin) {
		var permMod12 = this.permMod12,
			perm = this.perm,
			grad3 = this.grad3;
		var n0=0, n1=0, n2=0; // Noise contributions from the three corners
		// Skew the input space to determine which simplex cell we're in
		var s = (xin + yin) * F2; // Hairy factor for 2D
		var i = Math.floor(xin + s);
		var j = Math.floor(yin + s);
		var t = (i + j) * G2;
		var X0 = i - t; // Unskew the cell origin back to (x,y) space
		var Y0 = j - t;
		var x0 = xin - X0; // The x,y distances from the cell origin
		var y0 = yin - Y0;
		// For the 2D case, the simplex shape is an equilateral triangle.
		// Determine which simplex we are in.
		var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
		if (x0 > y0) {
			i1 = 1;
			j1 = 0;
		} // lower triangle, XY order: (0,0)->(1,0)->(1,1)
		else {
			i1 = 0;
			j1 = 1;
		} // upper triangle, YX order: (0,0)->(0,1)->(1,1)
		// A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
		// a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
		// c = (3-sqrt(3))/6
		var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
		var y1 = y0 - j1 + G2;
		var x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
		var y2 = y0 - 1.0 + 2.0 * G2;
		// Work out the hashed gradient indices of the three simplex corners
		var ii = i & 255;
		var jj = j & 255;
		// Calculate the contribution from the three corners
		var t0 = 0.5 - x0 * x0 - y0 * y0;
		if (t0 >= 0) {
			var gi0 = permMod12[ii + perm[jj]] * 3;
			t0 *= t0;
			n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0); // (x,y) of grad3 used for 2D gradient
		}
		var t1 = 0.5 - x1 * x1 - y1 * y1;
		if (t1 >= 0) {
			var gi1 = permMod12[ii + i1 + perm[jj + j1]] * 3;
			t1 *= t1;
			n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1);
		}
		var t2 = 0.5 - x2 * x2 - y2 * y2;
		if (t2 >= 0) {
			var gi2 = permMod12[ii + 1 + perm[jj + 1]] * 3;
			t2 *= t2;
			n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2);
		}
		// Add contributions from each corner to get the final noise value.
		// The result is scaled to return values in the interval [-1,1].
		return 70.0 * (n0 + n1 + n2);
	},
	// 3D simplex noise
	noise3D: function (xin, yin, zin) {
		var permMod12 = this.permMod12,
			perm = this.perm,
			grad3 = this.grad3;
		var n0, n1, n2, n3; // Noise contributions from the four corners
		// Skew the input space to determine which simplex cell we're in
		var s = (xin + yin + zin) * F3; // Very nice and simple skew factor for 3D
		var i = Math.floor(xin + s);
		var j = Math.floor(yin + s);
		var k = Math.floor(zin + s);
		var t = (i + j + k) * G3;
		var X0 = i - t; // Unskew the cell origin back to (x,y,z) space
		var Y0 = j - t;
		var Z0 = k - t;
		var x0 = xin - X0; // The x,y,z distances from the cell origin
		var y0 = yin - Y0;
		var z0 = zin - Z0;
		// For the 3D case, the simplex shape is a slightly irregular tetrahedron.
		// Determine which simplex we are in.
		var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
		var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
		if (x0 >= y0) {
			if (y0 >= z0) {
				i1 = 1;
				j1 = 0;
				k1 = 0;
				i2 = 1;
				j2 = 1;
				k2 = 0;
			} // X Y Z order
			else if (x0 >= z0) {
				i1 = 1;
				j1 = 0;
				k1 = 0;
				i2 = 1;
				j2 = 0;
				k2 = 1;
			} // X Z Y order
			else {
				i1 = 0;
				j1 = 0;
				k1 = 1;
				i2 = 1;
				j2 = 0;
				k2 = 1;
			} // Z X Y order
		}
		else { // x0<y0
			if (y0 < z0) {
				i1 = 0;
				j1 = 0;
				k1 = 1;
				i2 = 0;
				j2 = 1;
				k2 = 1;
			} // Z Y X order
			else if (x0 < z0) {
				i1 = 0;
				j1 = 1;
				k1 = 0;
				i2 = 0;
				j2 = 1;
				k2 = 1;
			} // Y Z X order
			else {
				i1 = 0;
				j1 = 1;
				k1 = 0;
				i2 = 1;
				j2 = 1;
				k2 = 0;
			} // Y X Z order
		}
		// A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
		// a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
		// a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
		// c = 1/6.
		var x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords
		var y1 = y0 - j1 + G3;
		var z1 = z0 - k1 + G3;
		var x2 = x0 - i2 + 2.0 * G3; // Offsets for third corner in (x,y,z) coords
		var y2 = y0 - j2 + 2.0 * G3;
		var z2 = z0 - k2 + 2.0 * G3;
		var x3 = x0 - 1.0 + 3.0 * G3; // Offsets for last corner in (x,y,z) coords
		var y3 = y0 - 1.0 + 3.0 * G3;
		var z3 = z0 - 1.0 + 3.0 * G3;
		// Work out the hashed gradient indices of the four simplex corners
		var ii = i & 255;
		var jj = j & 255;
		var kk = k & 255;
		// Calculate the contribution from the four corners
		var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
		if (t0 < 0) n0 = 0.0;
		else {
			var gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
			t0 *= t0;
			n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0 + grad3[gi0 + 2] * z0);
		}
		var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
		if (t1 < 0) n1 = 0.0;
		else {
			var gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
			t1 *= t1;
			n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1 + grad3[gi1 + 2] * z1);
		}
		var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
		if (t2 < 0) n2 = 0.0;
		else {
			var gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
			t2 *= t2;
			n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2 + grad3[gi2 + 2] * z2);
		}
		var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
		if (t3 < 0) n3 = 0.0;
		else {
			var gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
			t3 *= t3;
			n3 = t3 * t3 * (grad3[gi3] * x3 + grad3[gi3 + 1] * y3 + grad3[gi3 + 2] * z3);
		}
		// Add contributions from each corner to get the final noise value.
		// The result is scaled to stay just inside [-1,1]
		return 32.0 * (n0 + n1 + n2 + n3);
	},
	// 4D simplex noise, better simplex rank ordering method 2012-03-09
	noise4D: function (x, y, z, w) {
		var permMod12 = this.permMod12,
			perm = this.perm,
			grad4 = this.grad4;

		var n0, n1, n2, n3, n4; // Noise contributions from the five corners
		// Skew the (x,y,z,w) space to determine which cell of 24 simplices we're in
		var s = (x + y + z + w) * F4; // Factor for 4D skewing
		var i = Math.floor(x + s);
		var j = Math.floor(y + s);
		var k = Math.floor(z + s);
		var l = Math.floor(w + s);
		var t = (i + j + k + l) * G4; // Factor for 4D unskewing
		var X0 = i - t; // Unskew the cell origin back to (x,y,z,w) space
		var Y0 = j - t;
		var Z0 = k - t;
		var W0 = l - t;
		var x0 = x - X0; // The x,y,z,w distances from the cell origin
		var y0 = y - Y0;
		var z0 = z - Z0;
		var w0 = w - W0;
		// For the 4D case, the simplex is a 4D shape I won't even try to describe.
		// To find out which of the 24 possible simplices we're in, we need to
		// determine the magnitude ordering of x0, y0, z0 and w0.
		// Six pair-wise comparisons are performed between each possible pair
		// of the four coordinates, and the results are used to rank the numbers.
		var rankx = 0;
		var ranky = 0;
		var rankz = 0;
		var rankw = 0;
		if (x0 > y0) rankx++;
		else ranky++;
		if (x0 > z0) rankx++;
		else rankz++;
		if (x0 > w0) rankx++;
		else rankw++;
		if (y0 > z0) ranky++;
		else rankz++;
		if (y0 > w0) ranky++;
		else rankw++;
		if (z0 > w0) rankz++;
		else rankw++;
		var i1, j1, k1, l1; // The integer offsets for the second simplex corner
		var i2, j2, k2, l2; // The integer offsets for the third simplex corner
		var i3, j3, k3, l3; // The integer offsets for the fourth simplex corner
		// simplex[c] is a 4-vector with the numbers 0, 1, 2 and 3 in some order.
		// Many values of c will never occur, since e.g. x>y>z>w makes x<z, y<w and x<w
		// impossible. Only the 24 indices which have non-zero entries make any sense.
		// We use a thresholding to set the coordinates in turn from the largest magnitude.
		// Rank 3 denotes the largest coordinate.
		i1 = rankx >= 3 ? 1 : 0;
		j1 = ranky >= 3 ? 1 : 0;
		k1 = rankz >= 3 ? 1 : 0;
		l1 = rankw >= 3 ? 1 : 0;
		// Rank 2 denotes the second largest coordinate.
		i2 = rankx >= 2 ? 1 : 0;
		j2 = ranky >= 2 ? 1 : 0;
		k2 = rankz >= 2 ? 1 : 0;
		l2 = rankw >= 2 ? 1 : 0;
		// Rank 1 denotes the second smallest coordinate.
		i3 = rankx >= 1 ? 1 : 0;
		j3 = ranky >= 1 ? 1 : 0;
		k3 = rankz >= 1 ? 1 : 0;
		l3 = rankw >= 1 ? 1 : 0;
		// The fifth corner has all coordinate offsets = 1, so no need to compute that.
		var x1 = x0 - i1 + G4; // Offsets for second corner in (x,y,z,w) coords
		var y1 = y0 - j1 + G4;
		var z1 = z0 - k1 + G4;
		var w1 = w0 - l1 + G4;
		var x2 = x0 - i2 + 2.0 * G4; // Offsets for third corner in (x,y,z,w) coords
		var y2 = y0 - j2 + 2.0 * G4;
		var z2 = z0 - k2 + 2.0 * G4;
		var w2 = w0 - l2 + 2.0 * G4;
		var x3 = x0 - i3 + 3.0 * G4; // Offsets for fourth corner in (x,y,z,w) coords
		var y3 = y0 - j3 + 3.0 * G4;
		var z3 = z0 - k3 + 3.0 * G4;
		var w3 = w0 - l3 + 3.0 * G4;
		var x4 = x0 - 1.0 + 4.0 * G4; // Offsets for last corner in (x,y,z,w) coords
		var y4 = y0 - 1.0 + 4.0 * G4;
		var z4 = z0 - 1.0 + 4.0 * G4;
		var w4 = w0 - 1.0 + 4.0 * G4;
		// Work out the hashed gradient indices of the five simplex corners
		var ii = i & 255;
		var jj = j & 255;
		var kk = k & 255;
		var ll = l & 255;
		// Calculate the contribution from the five corners
		var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0;
		if (t0 < 0) n0 = 0.0;
		else {
			var gi0 = (perm[ii + perm[jj + perm[kk + perm[ll]]]] % 32) * 4;
			t0 *= t0;
			n0 = t0 * t0 * (grad4[gi0] * x0 + grad4[gi0 + 1] * y0 + grad4[gi0 + 2] * z0 + grad4[gi0 + 3] * w0);
		}
		var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1;
		if (t1 < 0) n1 = 0.0;
		else {
			var gi1 = (perm[ii + i1 + perm[jj + j1 + perm[kk + k1 + perm[ll + l1]]]] % 32) * 4;
			t1 *= t1;
			n1 = t1 * t1 * (grad4[gi1] * x1 + grad4[gi1 + 1] * y1 + grad4[gi1 + 2] * z1 + grad4[gi1 + 3] * w1);
		}
		var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2;
		if (t2 < 0) n2 = 0.0;
		else {
			var gi2 = (perm[ii + i2 + perm[jj + j2 + perm[kk + k2 + perm[ll + l2]]]] % 32) * 4;
			t2 *= t2;
			n2 = t2 * t2 * (grad4[gi2] * x2 + grad4[gi2 + 1] * y2 + grad4[gi2 + 2] * z2 + grad4[gi2 + 3] * w2);
		}
		var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3;
		if (t3 < 0) n3 = 0.0;
		else {
			var gi3 = (perm[ii + i3 + perm[jj + j3 + perm[kk + k3 + perm[ll + l3]]]] % 32) * 4;
			t3 *= t3;
			n3 = t3 * t3 * (grad4[gi3] * x3 + grad4[gi3 + 1] * y3 + grad4[gi3 + 2] * z3 + grad4[gi3 + 3] * w3);
		}
		var t4 = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4;
		if (t4 < 0) n4 = 0.0;
		else {
			var gi4 = (perm[ii + 1 + perm[jj + 1 + perm[kk + 1 + perm[ll + 1]]]] % 32) * 4;
			t4 *= t4;
			n4 = t4 * t4 * (grad4[gi4] * x4 + grad4[gi4 + 1] * y4 + grad4[gi4 + 2] * z4 + grad4[gi4 + 3] * w4);
		}
		// Sum up and scale the result to cover the range [-1,1]
		return 27.0 * (n0 + n1 + n2 + n3 + n4);
	}
};

// amd
if (typeof define !== 'undefined' && define.amd) define(function(){return ProceduralTerrain;});
//common js
if (typeof exports !== 'undefined') exports.ProceduralTerrain = ProceduralTerrain;
// browser
else if (typeof navigator !== 'undefined') this.ProceduralTerrain = ProceduralTerrain;
// nodejs
if (typeof module !== 'undefined') {
	module.exports = ProceduralTerrain;
}

})();
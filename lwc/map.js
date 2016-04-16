function UsMap(domRoot, onLoad) {

	var svg = d3.select(domRoot).append('div').append("svg")

	var defs = svg.append('defs')

	var world = svg.append('g').attr('class', 'world');

	var this_ = this;

	queue()
		.defer(d3.json, "us.json")
		.await(function ready(error, us) {
			if (error) throw error;
			console.log("drawing geometry");
			this_.drawMapGeometry(us);

			if (onLoad) {
				onLoad();
			}
		});

	this_.resizeRatio = 1;

	this.resize = function() {
		this_.positionLegend();

		if (this_.originalWidth) {
			var rect = svg.node().getBoundingClientRect();

			var width = rect.width;

			this_.resizeRatio = width / this_.originalWidth;

			var nextWorldHeight = this_.worldRect.height * (this_.zoomScale * this_.resizeRatio);

			var deltaY = (nextWorldHeight - world.node().getBoundingClientRect().height);

			this_.zoomTranslate[1] -= deltaY;

			this_.zoom.translate(this_.zoomTranslate);

			this_.updateZoom();
		}
	};

	this.updateZoom = function() {
		var scale = this_.zoomScale * this_.resizeRatio;

		console.log('update zoom');

		world.attr("transform", "translate(" + this_.zoomTranslate + ")scale(" + scale + ")");
	}

	window.addEventListener("optimizedResize", function() {
    	this_.resize();
	});

	this.drawMapGeometry = function(map) {

		var rect = svg.node().getBoundingClientRect();

		var width = rect.width;
		var height = rect.height;

		this.originalWidth = width;

		var projection = d3.geo.albersUsa()
			.scale(width * 1.22)
			.translate([width / 2 + 30, height / 2]);

		var path = d3.geo.path()
			.projection(projection);

		

		var highlightNode;

		defs.selectAll("path")
			.data(topojson.feature(map, map.objects.counties).features)
		.enter().append("path")
			.attr("id", function(d) {
				var id = d.id;
				return "path" + id;
			})
			.attr("d", path)


		var counties = world.append("g")
			.attr("class", "counties")

		counties.selectAll("use")
			.data(topojson.feature(map, map.objects.counties).features)
		.enter().append("use").attr('xlink:href', function(d) {
			var id = d.id;
			return "#path" + id;
		}).on('mouseover', function(d) {
				if (this_.tip) {
					this_.tip.show(d);
				}

				// Adapted from: http://colorbrewer2.org/#
				highlightNode = $(this).clone()
					.css({"pointer-events":"none","stroke":"#000","stroke-width":"2"})
					.appendTo(world.node());
			})
			.on('mouseout', function(d) {
				if (this_.tip) {
					this_.tip.hide(d);
				}

				highlightNode.remove();
			})
			.on('click', function(d) {
				var delta = new Date() - this_.zoomTime;

				console.log(this_.zoomCounter + ", " + delta);


				if (this_.zooming !== true || 
					(this_.zooming === true && this_.zoomCounter <= 3 
						&& (delta < 333)))
				{
						this_.overCounty(d);
				}

				this_.zooming = false;
				this_.zoomCounter = 0;
			});

		world.append("path")
			.datum(topojson.mesh(map, map.objects.states, function(a, b) { return a !== b; }))
			.attr("class", "states")
			.attr("d", path);

		this_.worldRect = world.node().getBoundingClientRect();


		this.addZoom();
	};

	/**
	 * Handler should be a function accepting 1 parameter, d
	 */
	this.addTooltipHandler = function(handler) {
		this.tip = d3.tip()
			.attr('class', 'd3-tip')
			.offset([-10, 0])
			.direction('n')
			.html(handler);

		svg.call(this.tip);
	};

	this_.zoomCounter = -1;
	this.addZoom = function() {
		// https://bl.ocks.org/mbostock/8fadc5ac9c2a9e7c5ba2

		var zoom = d3.behavior.zoom()
			.scaleExtent([.25, 30])
			.on("zoom", function() {
				if (this_.zoomCounter == 0) {
					this_.zoomTime = new Date();
				}

				this_.zoomCounter++;


				this_.zooming = d3.event.sourceEvent != null && d3.event.sourceEvent.type === 'mousemove';

				this_.zoomTranslate = d3.event.translate;
				this_.zoomScale = d3.event.scale;

				this_.updateZoom();
			});

		svg.call(zoom).call(zoom.event);
		this_.zoom = zoom;
	};

	var white = d3.rgb(255, 255, 255);

	this.recolor = function(countyDataMap) {

		// Not sure correct terminology... basically buckets from 0..1
		if (this.percentiles) {
			var percentiles = this.percentiles;
		} else {
			var percentiles = d3.range(0, 1, .005)
			percentiles.push(1)
			this.percentiles = percentiles;
		}

		var totals = countyDataMap.values();
		
		var cdf = d3.scale.quantile()
			.domain(totals)
			.range(percentiles);

		var colorScale = this.buildDivergentScale(
			d3.rgb(0, 0, 227),
			d3.rgb(255,255,191),
			d3.rgb(203, 0, 0)
		);

		d3.selectAll(".counties > use").attr('fill', function(d) {
			var lw = countyDataMap.get(d.id);

			if (lw) {
				return colorScale(cdf(lw));
			}else{
				//console.log("Unrecognized FIPS code: " + d.id);
				return white;
			}
		});

		var legendPoints = [.25, .5, .75];
		var minLegend = cdf.invertExtent(0)[0]
		var maxLegend = cdf.invertExtent(1)[1]

		var legendDomain = [minLegend]
		legendPoints.forEach(function(p) {
			var val = cdf.invertExtent(p);
			val = val[0] + (val[1] - val[0]) / 2;

			legendDomain.push(val)
		});
		legendDomain.push(maxLegend);

		var legendColorScale = d3.scale.ordinal();
		legendColorScale.domain(legendDomain);
		legendColorScale.range(legendDomain.map(function(d) {
			return d3.rgb(colorScale(cdf(d)));
		}));

		var labelFormat = d3.format('$,.02f');

		if (this.legend === undefined) {
			this.legend = d3.legend.color();

			svg.append('g')
				.attr('class', 'colorLegend')

			this.positionLegend();
		}
		
		this.legend
			.scale(legendColorScale)
			.labels(legendDomain.map(function(d) {
				// d3.legend's labelFormat not working
				return labelFormat(d);
			}));

		svg.select('.colorLegend').call(this.legend)
	};

	this.positionLegend = function() {

		if (this.legend) {
			var rect = svg.node().getBoundingClientRect();

			var width = rect.width - 115;
			var height = rect.height - 90;

			svg.select('.colorLegend')
				.attr('transform', 'translate(' + width + ', ' + height + ')');
		}
	}

		// Interpolate between 3 colors.
	this.buildDivergentScale = function(lowerColor, midColor, upperColor) {
		var lowerColorScale = d3.scale.linear()
			.domain([0, .5])
			.range([lowerColor, midColor])
			.interpolate(d3.interpolateRgb)

		var upperColorScale = d3.scale.linear()
			.domain([.5, 1])
			.range([midColor, upperColor])
			.interpolate(d3.interpolateRgb)

		return function(val) {
			return (val <= .5) ? lowerColorScale(val) : upperColorScale(val);
		};
	}
}
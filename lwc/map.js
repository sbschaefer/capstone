function UsMap(domRoot, onLoad) {

	var svg = d3.select(domRoot).append('div').append("svg")

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
			.scale(width * 1.15)
			.translate([width / 2 + 30, height / 2]);

		var path = d3.geo.path()
			.projection(projection);

		var counties = world.append("g")
			.attr("class", "counties")

		var highlightNode;

		counties.selectAll("path")
			.data(topojson.feature(map, map.objects.counties).features)
		.enter().append("path")
			.attr("d", path)
			.on('mouseover', function(d) {
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

		var states = world.append("path")
			.datum(topojson.mesh(map, map.objects.states, function(a, b) { return a !== b; }))
			.attr("class", "states")
			.attr("d", path);

		this_.states = states;
		this_.counties = counties;

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

		var totals = countyDataMap.values();

		var minValue = d3.min(totals);
		var maxValue = d3.max(totals);

		if (minValue == maxValue) {

			this_.previousNoData = true;
			this_.counties.attr('class', 'counties countiesblack');
			this_.states.attr('class', 'states statesblack');

		}else if (this_.previousNoData) {
			this_.counties.attr('class', 'counties');
			this_.states.attr('class', 'states');
			this_.previousNoData = false;
		}

		var colorScale = this.buildDivergentScale(
			[minValue, maxValue],
			d3.rgb(0, 0, 227),
			d3.rgb(255,255,191),
			d3.rgb(203, 0, 0)
		);

		d3.selectAll(".counties > path").attr('fill', function(d) {
			var lw = countyDataMap.get(d.id);

			if (lw) {
				return colorScale(lw);
			}else{
				//console.log("Unrecognized FIPS code: " + d.id);
				return white;
			}
		});

		var labelFormat = d3.format('$,.02f');

		if (this.legend === undefined) {
			this.legend = d3.legend.color();
			this.legend.cells([5]);

			svg.append('g')
				.attr('class', 'colorLegend')

			this.positionLegend();
		}
		
		this.legend
			.scale(colorScale)
			.labelFormat(labelFormat);

		if (this.previousNoData) {
			svg.select('.colorLegend').selectAll("*").remove();
		} else {
			svg.select('.colorLegend').call(this.legend)
		}
	};

	this.positionLegend = function() {

		if (this.legend) {
			var rect = svg.node().getBoundingClientRect();

			var width = rect.width - 125;
			var height = rect.height - 90;

			svg.select('.colorLegend')
				.attr('transform', 'translate(' + width + ', ' + height + ')');
		}
	}

		// Interpolate between 3 colors.
	this.buildDivergentScale = function(domain, lowerColor, midColor, upperColor) {
		var midpoint = domain[0] + (domain[1] - domain[0]) / 2.0;

		var lowerColorScale = d3.scale.linear()
			.domain([domain[0], midpoint])
			.range([lowerColor, midColor])
			.interpolate(d3.interpolateRgb)

		var upperColorScale = d3.scale.linear()
			.domain([midpoint, domain[1]])
			.range([midColor, upperColor])
			.interpolate(d3.interpolateRgb)

		var scale = function(val) {
			return (val <= midpoint) ? lowerColorScale(val) : upperColorScale(val);
		};

		scale.domain = function() {
			return domain;
		}

		var ls = d3.scale.linear().domain(domain);

		scale.ticks = function(val) {
			return ls.ticks(val)
		}

		return scale;
	}
}
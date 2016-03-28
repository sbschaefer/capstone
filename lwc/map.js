function UsMap(domRoot, onLoad) {

	this.svg = d3.select(domRoot).append('div').append("svg")

	this.world = this.svg.append('g');

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

	this.drawMapGeometry = function(map) {

		var world = this.world;

		var rect = this.svg.node().getBoundingClientRect();

		var width = rect.width;
		var height = rect.height;

		var projection = d3.geo.albersUsa()
			.scale(width * 1.22)
			.translate([width / 2 + 30, height / 2]);

		var path = d3.geo.path()
			.projection(projection);

		var this_ = this;

		world.append("g")
		  .attr("class", "counties")
		.selectAll("path")
		  .data(topojson.feature(map, map.objects.counties).features)
		.enter().append("path")
		  .attr("d", path)
		  .on('mouseover', function(d) {
			if (this_.tip) {
				this_.tip.show(d);
			}

			this_.overCounty(d);
		  })
		  .on('mouseout', function(d) {
			if (this_.tip) {
				this_.tip.hide(d);
			}
		  });

		world.append("path")
		  .datum(topojson.mesh(map, map.objects.states, function(a, b) { return a !== b; }))
		  .attr("class", "states")
		  .attr("d", path);

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

		this.svg.call(this.tip);
	};

	this.addZoom = function() {
		// https://bl.ocks.org/mbostock/8fadc5ac9c2a9e7c5ba2
		var world = this.world;

		var zoom = d3.behavior.zoom()
			.scaleExtent([1, 10])
			.on("zoom", function() {
				world.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");  	
			});

		this.svg.call(zoom).call(zoom.event);
	};

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
		var min = d3.min(totals);
		var max = d3.max(totals);

		var cdf = d3.scale.quantile()
			.domain(totals)
			.range(percentiles);

		// var colorScale = d3.scale.linear()
		// 	.domain([0, 1])
		// 	//.range([d3.rgb(237, 248, 233), d3.rgb(0, 109, 44)])
		// 	//.range([d3.rgb(0, 0, 0), d3.rgb(255, 0, 0)])
		// 	.range([d3.rgb(221, 242, 215), d3.rgb(0, 109, 44)])
		// 	.interpolate(d3.interpolateRgb);

		var colorScale = this.buildDivergentScale(
			d3.rgb(0, 0, 217),
			d3.rgb(188, 188, 188),
			d3.rgb(186, 0, 0)
		);

		var white = d3.rgb(255, 255, 255);

		d3.selectAll(".counties > path").attr('fill', function(d) {
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

		if (this.legend) {
			var prevLegend = this.svg.select('.colorLegend');
			prevLegend.remove();
		}

		
		var labelFormat = d3.format('$,.02f');

		this.legend = d3.legend.color()
			
			.labels(legendDomain.map(function(d) {
				// d3.legend's labelFormat not working
				return labelFormat(d);
			}))
			.scale(legendColorScale);

		var rect = this.svg.node().getBoundingClientRect();

		var width = rect.width - 115;
		var height = rect.height - 90;

		this.svg.append('g')
			.attr('class', 'colorLegend')
			.attr('transform', 'translate(' + width + ', ' + height + ')');

		this.svg.select('.colorLegend').call(this.legend)
			

	};

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
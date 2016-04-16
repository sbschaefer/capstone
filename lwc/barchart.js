
// Adapted From: https://bl.ocks.org/mbostock/3885304
function barchart(parentNode, userHeight) {

	var parentNode = parentNode;

	var margin = {top: 20, right: 20, bottom: 30, left: 50},
			width = 325 - margin.left - margin.right,
			height = ((userHeight !== undefined) ? userHeight : 500);

	var x = d3.scale.ordinal()
			.rangeRoundBands([0, width], .1);

	var y = d3.scale.linear()
			.range([height - margin.top - margin.bottom, 0]);

	var xAxisIcons = {
		'food': '\uf101',
		'insurance': '\uf100',
		'medical': '\uf103',
		'transportation': '\uf108',
		'housing': '\uf102',
		'other': '\uf106',
		'benefits': '\uf104',
		'taxes': '\uf107',
		'childcare': '\uf105'
	};

	var xAxisLabels = ['Housing', 'Food', 'Childcare', 'Medical',
		'Transportation', 'Miscellaneous', 'Benefits', 'Taxes'];

	var xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom")
		.tickFormat(function(d) {
			return xAxisIcons[d];
		})
		.tickPadding(10)
		.tickSize(0);

	var yAxis = d3.svg.axis()
		.scale(y)
		.orient("left")
		.ticks(10)
		.tickFormat(d3.format("$,.02"));

	var mainSvg = parentNode.append("svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height)

	var svg = mainSvg.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	svg.append("g")
			.attr("class", "y axis")

	this.tip = d3.tip()
		.attr('class', 'bc-d3-tip')
		.offset([-10, 0])
		.html(function(d) {
				return "<span style='color:white'>$" + (d.value).toFixed(2) + "</span>";
		});

	svg.call(this.tip);

	var colors = d3.scale.category10();

	var this_ = this;

	this.setSize = function(newHeight) {

		newHeight = (newHeight > 550) ? 550 : newHeight;

		mainSvg.attr('height', newHeight);
		y.range([newHeight - margin.top - margin.bottom, 0]);
	}

	this.update = function(model, dataRow, yDomain) {

		var columns = ['housing', 'food', 'childcare', 'medical', 'transportation', 'other', 'benefits', 'taxes']
		x.domain(columns);

		var data = []

		var vals = [];

		if (dataRow) {
			columns.map(function(c) {
				var val = +dataRow[model[c]];
				data.push({id: c, value: val})
				vals.push(val);
			});
		} else {
			columns.map(function(c) {
				data.push({id: c, value: 0})
			});
		}

		if (yDomain) {
			var dataMin = yDomain[0];
			var dataMax = yDomain[1];
		} else {
			var dataMin = d3.min(vals);
			var dataMax = d3.max(vals);
		}

		this.chartData = {
			data : data,
			yDomain : [dataMin, dataMax]
		}

		this.draw();
	};

	this.draw = function(isResize) {

		var iconMap = this.xAxisIcons;

		var cd = this.chartData;

		if (cd === undefined) {
			return;
		}

		var yheight = y.range()[0];
				
		if (this.xAxisRendered === undefined) {
				svg.append("g")
						.attr("class", "x axis")
						.attr("transform", "translate(0," + yheight + ")")
					.call(xAxis);

			svg.selectAll('.x.axis > .tick > text')
				.attr("fill", function(d, i) {return colors(i);})
				.append("svg:title")
					.text(function(d,i) {
						//var title = document.createElementNS("http://www.w3.org/2000/svg", "title");
						return xAxisLabels[i];
					});
			
			this.xAxisRendered = true;
		}else{
			svg.selectAll('.x.axis').attr("transform", "translate(0," + yheight + ")")
		}

		//Rescale y-axis
		if (!cd.data.every(function(element) {return element === 0;})) {
			y.domain(cd.yDomain);
		}

		svg.select('.y.axis')
					.call(yAxis);
			

		var bars = svg.selectAll(".bar").data(cd.data);
		var dataMin = cd.yDomain[0];

		bars.enter().append("rect")
			.attr("class", "bar")
			.attr("fill", function(d, i) {return colors(i);})
			.on('mouseover', this.tip.show)
			.on('mouseout', this.tip.hide);

		bars.attr("class", "bar")
			.attr("x", function(d) { return x(d.id); })
			.attr("width", x.rangeBand())
			.attr("y", function(d) {
				var v = d.value;
				var yCoord = y(Math.max(0, d.value))
				return yCoord; 
			})
			.attr("height", function(d) { 
				return Math.abs(y(d.value) - y(Math.max(dataMin, 0)));
			})
	}
}

// Adapted From: https://bl.ocks.org/mbostock/3885304
function barchart(parentNode) {

	var margin = {top: 20, right: 20, bottom: 30, left: 50},
			width = 300 - margin.left - margin.right,
			height = 500 - margin.top - margin.bottom;

	var x = d3.scale.ordinal()
			.rangeRoundBands([0, width], .1);

	var y = d3.scale.linear()
			.range([height, 0]);

	var xAxisIcons = {
		'food': '\uf101',
		'insurance': '\uf100',
		'medical': '\uf103',
		'transportation': '\uf108',
		'housing': '\uf102',
		'other': '\uf106',
		'benefits': '\uf014',
		'taxes': '\uf107',
		'childcare': '\uf105'
	};

	var xAxisLabels = ['Housing', 'Food', 'Childcare', 'Medical',
		'Transportation', 'Miscellaneous', 'Taxes'];

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

	var svg = parentNode.append("svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
		.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	svg.append("g")
			.attr("class", "y axis")

	this.tip = d3.tip()
		.attr('class', 'bc-d3-tip')
		.offset([-10, 0])
		.html(function(d) {
				return "<span style='color:red'>$" + (d.value).toFixed(2) + "</span>";
		});

	svg.call(this.tip);

	var colors = d3.scale.category10();

	this.update = function(model, dataRow) {

		var columns = ['housing', 'food', 'childcare', 'medical', 'transportation', 'other', 'taxes']

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

		var iconMap = this.xAxisIcons;
		x.domain(columns);
		
		if (this.xAxisRendered === undefined) {
				svg.append("g")
						.attr("class", "x axis")
						.attr("transform", "translate(0," + height + ")")
					.call(xAxis);

			d3.selectAll('.x.axis > .tick > text')
				.attr("fill", function(d, i) {return colors(i);})
				.append("svg:title")
					.text(function(d,i) {
						//var title = document.createElementNS("http://www.w3.org/2000/svg", "title");
						return xAxisLabels[i];
					});
			
			this.xAxisRendered = true;
		}

		var dataMin = d3.min(vals);
		var dataMax = d3.max(vals);

		//Rescale y-axis
		if (dataRow) {
			y.domain([dataMin, dataMax]);

			svg.select('.y.axis')
					.call(yAxis);
		}

		var bars = svg.selectAll(".bar").data(data);

		bars.enter().append("rect")
			.attr("class", "bar")
			.attr("fill", function(d, i) {return colors(i);})
			.on('mouseover', this.tip.show)
			.on('mouseout', this.tip.hide);

		bars.attr("class", "bar")
			.attr("x", function(d) { return x(d.id); })
			.attr("width", x.rangeBand())
			.attr("y", function(d) { return y(Math.max(0, d.value)); })
			//.attr("height", function(d) { return height - y(d.value); })
			.attr("height", function(d) { 
				return Math.abs(y(d.value) - y(Math.max(dataMin, 0)));
			})
	}
}
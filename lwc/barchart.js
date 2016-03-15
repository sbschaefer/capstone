
// Adapted From: https://bl.ocks.org/mbostock/3885304
function barchart(parentNode) {

  var margin = {top: 20, right: 20, bottom: 30, left: 40},
      width = 300 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var x = d3.scale.ordinal()
      .rangeRoundBands([0, width], .1);

  var y = d3.scale.linear()
      .range([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .ticks(10);

  var svg = parentNode.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");



  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Cost");

  this.tip = d3.tip()
  .attr('class', 'bc-d3-tip')
  .offset([-10, 0])
  .html(function(d) {
    return "<span style='color:red'>$" + (d.value).toFixed(2) + "</span>";
  });

  svg.call(this.tip);

  this.update = function(dataRow) {

    var columns = ['food_cost','insurance_cost','healthcare_cost',
                    'housing_cost','transportation_cost','other_cost']

    var data = []

    columns.map(function(c) {
      data.push({id: c.substring(0, 5), value: +dataRow[c]})
    })

    //columns = columns.map(function(c) {return c.substring(0, 5)})

    x.domain(data.map(function(d) { return d.id; }));


    //y.domain([0, d3.max(data, function(d) { return d.value; })]);
    y.domain([0, 15000]); //to-do: fix this

    //var dataById = d3.map(data, function(d) {return d.id;});

    if (this.xAxisRendered === undefined) {
      svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);
      this.xAxisRendered = true;
    }


    var bars = svg.selectAll(".bar")
          .data(data);

    bars.enter().append("rect")
          .attr("class", "bar")
          .attr("x", function(d) { return x(d.id); })
          .attr("width", x.rangeBand())
          .attr("y", function(d) { return y(d.value); })
          .attr("height", function(d) { return height - y(d.value); })
          .on('mouseover', this.tip.show)
          .on('mouseout', this.tip.hide);

    bars.attr("class", "bar")
          .attr("x", function(d) { return x(d.id); })
          .attr("width", x.rangeBand())
          .attr("y", function(d) { return y(d.value); })
          .attr("height", function(d) { return height - y(d.value); })
  }
}
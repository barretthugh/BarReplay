function gencards( code_list ) {
  const chartString = `<div id="container" style="height: 400px; min-width: 310px"></div>`
  const cardString1 = `<div class="card" style="width: 100%;">`
  const cardString2 = `</div>`
  const cardsContainer = document.querySelector( '#cardsContainer' );
  const rowBegin = `<div class="row">`
  const rowEnd = `</div>`
  let context = ''

  for ( i = 0; i < code_list.length; i++ ) {
    if ( i === 0 ) {
      context += rowBegin
    } else {
      if ( i % 3 === 0 ) {
        context += rowEnd
        context += rowBegin
      }
    }
    context += `<div class="col">${ cardString1}<div id="${ code_list[ i ]}container" style="height: 400px; min-width: 310px"></div>${ cardString2 }</div>`
    if ( i === code_list.length - 1 ) {
      context += rowEnd
    }
  }
  cardsContainer.innerHTML += context;
}

function createHighchart( code, socket ) {
  var ohlc = [],
    volume = [];

  // create the chart
  Highcharts.stockChart( code + 'container', {
    chart: {
      events: {
        load: function () {
          this
            .stockTools
            .showhideBtn
            .click();
          let theChart = this;
          let ohlcseries = this.series[ 0 ];
          let volseries = this.series[ 1 ];
          let i = 0;

          socket.on( code, function ( data ) {
            ohlcseries.addPoint( [
              Date.parse( data[ 'data' ].datetime ),
              Number.parseFloat( data[ 'data' ].open ),
              Number.parseFloat( data[ 'data' ].high ),
              Number.parseFloat( data[ 'data' ].low ),
              Number.parseFloat( data[ 'data' ].close )
            ], true, false ); //Date.parse(sample.y.datetime)

            volseries.addPoint( [
              Date.parse( data[ 'data' ].datetime ),
              Number.parseInt( data[ 'data' ].vol )
            ], true, false );

            i++;

            theChart
              .renderer
              .label( data.code, 10, 0 )
              .add()
              .css( { color: 'grey', fontWeight: 600 } );
          } );
          // this.renderer.label(code, 10, 0)
          //       .add()
          //       .css({
          //         color: 'grey',
          //         fontWeight: 600
          //       });
        }
      }
    },

    stockTools: {
      gui: {
        buttons: [
          'thresholds',
          'separator',
          'indicators',
          'separator',
          'simpleShapes',
          'lines',
          'measure',
          'advanced',
          'toggleAnnotations',
          'separator',
          'separator',
          'fullScreen',
          'separator',
          'currentPriceIndicator'
        ],
        definitions: {
          thresholds: {
            className: 'highcharts-threshold-annotation',
            symbol: 'horizontal-line.svg'
          }
        }
      }
    },

    // title: {
    //     text: code
    // },
    navigator: {
      enabled: false
    },
    scrollbar: {
      enabled: false
    },
    rangeSelector: {
      enabled: false
    },
    tooltip: {
      enabled: false
    },
    time: {
      useUTC: false
    },
    yAxis: [
      {
        startOnTick: false,
        endOnTick: false,
        labels: {
          align: 'right',
          x: -3
        },
        height: '75%',
        lineWidth: 2
      }, {
        labels: {
          align: 'right',
          x: -3
        },
        top: '75%',
        height: '25%',
        offset: 0,
        lineWidth: 2
      }
    ],

    series: [
      {
        type: 'candlestick',
        name: 'ohlc',
        id: 'ohlc',
        zoomType: 'x',
        // zIndex: 2,
        data: ohlc
      }, {
        type: 'column',
        name: 'Volume',
        id: 'volume',
        data: volume,
        yAxis: 1
      }, {
        type: 'vbp',
        linkedTo: 'ohlc',
        params: {
          volumeSeriesID: 'volume'
        },
        dataLabels: {
          enabled: false
        },
        zoneLines: {
          enabled: false
        }
      }
    ]
  } );
}

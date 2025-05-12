var Chart;

document.addEventListener('DOMContentLoaded', function() {
  (Chart.defaults.global.defaultFontFamily =
    'Nunito'), '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
  Chart.defaults.global.defaultFontColor = '#858796';

  try {
    const pieDataElement = document.getElementById('pieChartData');
    if (!pieDataElement) {
      console.error('pieChartData element not found');
      return;
    }

    const pieData = JSON.parse(pieDataElement.textContent);
    console.log('Chart data loaded:', pieData); // Debug log

    if (!pieData.labels || !pieData.values || !pieData.colors) {
      console.error('Invalid pie chart data structure');
      return;
    }

    const ctx = document.getElementById('myPieChart');
    if (!ctx) {
      console.error('myPieChart element not found');
      return;
    }

    const backgroundColors = pieData.colors;

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: pieData.labels,
        datasets: [
          {
            data: pieData.values,
            backgroundColor: backgroundColors,
            hoverBackgroundColor: backgroundColors,
            hoverBorderColor: 'rgba(255, 255, 255, 1)'
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        tooltips: {
          bodyFontFamily: '\'Nunito\', sans-serif',
          titleFontFamily: '\'Nunito\', sans-serif',
          footerFontFamily: '\'Nunito\', sans-serif',
          backgroundColor: 'rgb(255,255,255)',
          bodyFontColor: '#858796',
          borderColor: '#dddfeb',
          borderWidth: 1,
          xPadding: 15,
          yPadding: 15,
          displayColors: false,
          caretPadding: 10,
          callbacks: {
            label: function(tooltipItem, data) {
              return `${data.labels[tooltipItem.index]}: ${data.datasets[0]
                .data[tooltipItem.index]} proyectos`;
            }
          }
        },
        legend: { display: false },
        cutoutPercentage: 80
      }
    });
  } catch (error) {
    console.error('Error initializing pie chart:', error);
  }
});

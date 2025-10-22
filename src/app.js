// Carga y procesamiento de datos
async function loadData() {
  const response = await fetch("../public/data.csv");
  const text = await response.text();
  const rows = text.trim().split("\n");
  const headers = rows[0].split(",");
  return rows.slice(1).map((row) => {
    const obj = {};
    row
      .split(",")
      .forEach((val, i) => (obj[headers[i]] = i === 2 ? Number(val) : val));
    return obj;
  });
}

// Filtrado por país
function filterByCountry(data, country) {
  return data.filter((d) =>
    d.pais.toLowerCase().includes(country.toLowerCase())
  );
}

// Estadísticas básicas
function calculateStats(data) {
  const values = data.map((d) => d.credito);
  return {
    max: Math.max(...values),
    min: Math.min(...values),
    sum: values.reduce((a, b) => a + b, 0),
    mean: ss.mean(values),
    mode: ss.mode(values),
    variance: ss.variance(values),
    stddev: ss.standardDeviation(values),
  };
}

// Renderizar estadísticas
function renderStats(stats) {
  const format = (n) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
  document.getElementById("stats").innerHTML = `
    <strong>Máximo:</strong> ${format(stats.max)}<br>
    <strong>Mínimo:</strong> ${format(stats.min)}<br>
    <strong>Suma:</strong> ${format(stats.sum)}<br>
    <strong>Promedio:</strong> ${format(stats.mean)}<br>
    <strong>Moda:</strong> ${format(stats.mode)}<br>
    <strong>Varianza:</strong> ${format(stats.variance)}<br>
    <strong>Desviación estándar:</strong> ${format(stats.stddev)}<br>
  `;
}

// Gráficos
let histogramChart, scatterChart;
function renderCharts(data) {
  const ctxHist = document.getElementById("histogram").getContext("2d");
  const ctxScatter = document.getElementById("scatter").getContext("2d");
  // Ordenar por año ascendente
  const sorted = [...data].sort((a, b) => Number(a.anio) - Number(b.anio));
  const values = sorted.map((d) => d.credito);
  const years = sorted.map((d) => d.anio);

  if (histogramChart) histogramChart.destroy();
  histogramChart = new Chart(ctxHist, {
    type: "bar",
    data: {
      labels: years,
      datasets: [
        { label: "Créditos", data: values, backgroundColor: "#4e79a7" },
      ],
    },
    options: { responsive: true },
  });

  if (scatterChart) scatterChart.destroy();
  scatterChart = new Chart(ctxScatter, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Créditos por Año",
          data: sorted.map((d) => ({ x: Number(d.anio), y: d.credito })),
          backgroundColor: "#f28e2b",
        },
      ],
    },
    options: { responsive: true },
  });
}

// Comparación entre años o países
function compare(data, key, value1, value2) {
  const group1 = data.filter((d) => d[key] === value1);
  const group2 = data.filter((d) => d[key] === value2);
  return {
    [value1]: calculateStats(group1),
    [value2]: calculateStats(group2),
  };
}

// Inicialización

let csvData = [];

function processCSV(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    // Detectar delimitador ; o ,
    const delimiter = text.indexOf(";") !== -1 ? ";" : ",";
    const rows = text.trim().split(/\r?\n/);
    const headers = rows[0].split(delimiter);
    // headers[0] = Country Name, headers[1...] = años
    let data = [];
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split(delimiter);
      const country = cols[0];
      for (let j = 1; j < cols.length; j++) {
        const year = headers[j];
        const value = Number(cols[j]);
        if (country && year && !isNaN(value)) {
          data.push({ pais: country, anio: year, credito: value });
        }
      }
    }
    csvData = data;
    document.getElementById(
      "excel-status"
    ).textContent = `Archivo CSV cargado (${csvData.length} registros)`;
    // Listar países únicos
    const countrySet = new Set(csvData.map((d) => d.pais));
    const countryList = Array.from(countrySet).sort();
    const ul = document.getElementById("country-names");
    ul.innerHTML = countryList.map((pais) => `<li>${pais}</li>`).join("");
    renderAll(csvData);
  };
  reader.readAsText(file);
}

function renderAll(data) {
  // Render inicial (primer país si existe)
  if (data.length) {
    const stats = calculateStats(data);
    renderStats(stats);
    renderCharts(data);
  }
  // Buscador
  const input = document.getElementById("country-search");
  input.oninput = () => {
    let filtered;
    if (input.value.trim() === "") {
      filtered = data;
    } else {
      filtered = filterByCountry(data, input.value);
    }
    if (filtered.length) {
      const stats = calculateStats(filtered);
      renderStats(stats);
      renderCharts(filtered);
    } else {
      document.getElementById("stats").innerHTML = "No se encontraron datos.";
      document
        .getElementById("histogram")
        .getContext("2d")
        .clearRect(
          0,
          0,
          document.getElementById("histogram").width,
          document.getElementById("histogram").height
        );
      document
        .getElementById("scatter")
        .getContext("2d")
        .clearRect(
          0,
          0,
          document.getElementById("scatter").width,
          document.getElementById("scatter").height
        );
    }
  };
  // Comparación
  document.getElementById("compare-btn").onclick = () => {
    const type = document.getElementById("compare-type").value;
    const value1 = document.getElementById("compare-value-1").value.trim();
    const value2 = document.getElementById("compare-value-2").value.trim();
    if (!value1 || !value2) {
      document.getElementById("comparison").innerHTML =
        '<span style="color:red">Por favor ingresa ambos valores para comparar.</span>';
      return;
    }
    const key = type === "pais" ? "pais" : "anio";
    const comp = compare(data, key, value1, value2);
    const format = (n) =>
      typeof n === "number" && !isNaN(n)
        ? n.toLocaleString("es-ES", { maximumFractionDigits: 2 })
        : n;
    document.getElementById("comparison").innerHTML = `
      <h3>Comparación de ${type === "pais" ? "países" : "años"}</h3>
      <div class="comp-block">
        <strong>${value1}</strong><br>
        Máx: ${format(comp[value1]?.max) ?? "-"}<br>
        Mín: ${format(comp[value1]?.min) ?? "-"}<br>
        Suma: ${format(comp[value1]?.sum) ?? "-"}<br>
        Promedio: ${format(comp[value1]?.mean) ?? "-"}<br>
        Moda: ${format(comp[value1]?.mode) ?? "-"}<br>
        Varianza: ${format(comp[value1]?.variance) ?? "-"}<br>
        Desv. estándar: ${format(comp[value1]?.stddev) ?? "-"}<br>
      </div>
      <div class="comp-block">
        <strong>${value2}</strong><br>
        Máx: ${format(comp[value2]?.max) ?? "-"}<br>
        Mín: ${format(comp[value2]?.min) ?? "-"}<br>
        Suma: ${format(comp[value2]?.sum) ?? "-"}<br>
        Promedio: ${format(comp[value2]?.mean) ?? "-"}<br>
        Moda: ${format(comp[value2]?.mode) ?? "-"}<br>
        Varianza: ${format(comp[value2]?.variance) ?? "-"}<br>
        Desv. estándar: ${format(comp[value2]?.stddev) ?? "-"}<br>
      </div>
      <canvas id="comp-histogram"></canvas>
      <canvas id="comp-scatter"></canvas>
    `;
    setTimeout(() => {
      const ctxCompHist = document
        .getElementById("comp-histogram")
        .getContext("2d");
      const ctxCompScatter = document
        .getElementById("comp-scatter")
        .getContext("2d");
      const group1 = data.filter((d) => d[key] === value1);
      const group2 = data.filter((d) => d[key] === value2);
      new Chart(ctxCompHist, {
        type: "bar",
        data: {
          labels: [value1, value2],
          datasets: [
            {
              label: "Suma de Créditos",
              data: [comp[value1]?.sum ?? 0, comp[value2]?.sum ?? 0],
              backgroundColor: ["#4e79a7", "#f28e2b"],
            },
          ],
        },
        options: { responsive: true },
      });
      new Chart(ctxCompScatter, {
        type: "scatter",
        data: {
          datasets: [
            {
              label: value1,
              data: group1.map((d) => ({ x: Number(d.anio), y: d.credito })),
              backgroundColor: "#4e79a7",
            },
            {
              label: value2,
              data: group2.map((d) => ({ x: Number(d.anio), y: d.credito })),
              backgroundColor: "#f28e2b",
            },
          ],
        },
        options: { responsive: true },
      });
    }, 100);
  };
}

window.onload = () => {
  // Carga de Excel o CSV
  document
    .getElementById("excel-file")
    .addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        if (file.name.endsWith(".csv")) {
          processCSV(file);
        } else {
          processExcel(file);
        }
      }
    });
};

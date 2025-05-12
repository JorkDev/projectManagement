// -------------------
// Imports and router setup
// -------------------

/**
 * @file Defines the dashboard route for the Project Management Panel:
 *   - GET / → fetch projects, compute summary metrics, and render the home dashboard
 */

const express = require('express'); // Express framework
const router = express.Router(); // Create a modular router
const db = require('../config/db'); // MySQL database connection
const axios = require('axios'); // HTTP client for external API calls

/** @type {{code:string,name:string,color:string}[]} Predefined project area options */
const areaOptions = [
  { code: '001', name: 'DIRECTORIO', color: '#f28b82' },
  { code: '002', name: 'ADMINISTRACION', color: '#8ab4f8' },
  { code: '003', name: 'CALIDAD', color: '#81c995' },
  { code: '004', name: 'SISTEMAS', color: '#fdd663' },
  { code: '005', name: 'OPERACIONES', color: '#ff8b80' },
  { code: '006', name: 'SERVICIO AL CLIENTE', color: '#aae6e3' },
  { code: '008', name: 'ARMADO', color: '#a5d6a7' },
  { code: '009', name: 'ARCHIVO', color: '#8c9eff' },
  { code: '010', name: 'TRANSPORTE', color: '#b388ff' },
  { code: '014', name: 'MENSAJERIA', color: '#8ce4f8' },
  { code: '015', name: 'CONTABILIDAD', color: '#f48fb1' },
  { code: '016', name: 'VISTO BUENO', color: '#b39ddb' },
  { code: '017', name: 'TECNICA LEGAL', color: '#90caf9' },
  { code: '018', name: 'RR.HH.', color: '#ffab91' },
  { code: '019', name: 'GERENCIA GENERAL', color: '#ff8a65' },
  { code: '023', name: 'CATALOGO', color: '#bcaaa4' },
  { code: '024', name: 'COMERCIAL', color: '#80cbc4' },
  { code: '027', name: 'PRODUCCION', color: '#a5d6a7' },
  { code: '028', name: 'SERVICIO AL CLIENTE', color: '#dce775' },
  { code: '033', name: 'SOPORTE OPERATIVO', color: '#82b1ff' },
];

/** @type {{[code:string]:string}} Fallback map from user codes to surnames */
const userCodeToName = {
  VJA001: 'JULCA',
  JRB001: 'RECOBA',
  KVA001: 'VALVERDE',
  MSA001: 'SEMINARIO',
  ERA001: 'ROJAS',
  LJP001: 'JARA',
  WAC001: 'ARGOTE',
  LQM001: 'QUINTANA',
  WOC001: 'OSORIO',
  GCC003: 'CHAVEZ',
  EJQ001: 'JAREZ'
};

// -------------------
// Routes
// -------------------

/**
 * GET /
 * @name GetDashboard
 * @description
 *   Fetches all projects, computes summary metrics (active, paused, average progress,
 *   completed, category progress, top areas, responsible counts), and renders the dashboard.
 */
router.get('/', async (req, res) => {
  try {
    // 1) Load all projects
    const [projects] = await db.execute('SELECT * FROM pms_projects');

    // 2) Quick metrics
    const activos = projects.filter(
      (p) => p.prod != 1 && p.priority != 6 && p.progress_percentage <= 100
    ).length;
    const pausados = projects.filter((p) => p.priority == 6).length;
    const inProgress = projects.filter(
      (p) =>
        p.prod != 1 &&
        p.progress_percentage != null &&
        p.progress_percentage < 100
    );
    const promedioAvance = inProgress.length
      ? Math.round(
        inProgress.reduce((sum, p) => sum + p.progress_percentage, 0) /
            inProgress.length
      )
      : 0;
    const completados = projects.filter((p) => p.prod == 1).length;

    // 3) Category‐wise averages & counts (4 categories)
    const categories = ['cartera1', 'cartera2', 'proyectos-ti', 'isco-cargo'];
    const categoryNames = {
      cartera1: 'Cartera #1',
      cartera2: 'Cartera #2',
      'proyectos-ti': 'Proyectos TI',
      'isco-cargo': 'ISCO Cargo'
    };
    // For detail cards:
    const categoryProgress = categories.map((cat) => {
      const list = projects.filter(
        (p) => p.category === cat && p.progress_percentage != null
      );
      const avg = list.length
        ? Math.round(
          list.reduce((sum, p) => sum + p.progress_percentage, 0) /
              list.length
        )
        : 0;
      return { name: categoryNames[cat], average: avg };
    });
    // For mixed chart:
    const categoryLabels = categories.map((cat) => categoryNames[cat]);
    const categoryCounts = categories.map(
      (cat) => projects.filter((p) => p.category === cat).length
    );
    const categoryAvgs = categories.map((cat) => {
      const list = projects.filter(
        (p) => p.category === cat && p.progress_percentage != null
      );
      return list.length
        ? Math.round(
          list.reduce((sum, p) => sum + p.progress_percentage, 0) /
              list.length
        )
        : 0;
    });

    // 4) Top 5 areas
    const areaCounts = projects.reduce((acc, p) => {
      const code = p.area || '000';
      const opt = areaOptions.find((a) => a.code === code) || {
        name: 'ISCO Cargo',
        color: '#dd9494'
      };
      acc[opt.name] = acc[opt.name] || { count: 0, color: opt.color };
      acc[opt.name].count++;
      return acc;
    }, {});
    const topAreas = Object.entries(areaCounts)
      .map(([name, d]) => ({ name, count: d.count, color: d.color }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 5) Responsible counts
    const respApi = await axios.get(
      `${process.env.API_URL}?KEY=${process.env.ORACLE_API_KEY}`
    );
    const users = respApi.data.data;
    const nameMap = users.reduce((m, u) => {
      m[u.cod_ascinsa] = u.apaterno;
      return m;
    }, {});
    const responsibleCounts = projects.reduce((acc, p) => {
      if (!p.responsible) return acc;
      let list;
      try {
        list = JSON.parse(p.responsible);
        if (!Array.isArray(list)) list = [list];
      } catch {
        list = p.responsible.split(',').map((x) => x.trim());
      }
      list.forEach((code) => {
        const who = userCodeToName[code] || nameMap[code] || code;
        acc[who] = (acc[who] || 0) + 1;
      });
      return acc;
    }, {});
    const responsibleData = Object.entries(responsibleCounts)
      .map(([responsible, count]) => ({ responsible, count }))
      .sort((a, b) => b.count - a.count);

    // 6) Render dashboard
    res.render('index', {
      title: 'Panel de Gestión de Proyectos',
      activePage: 'home',
      metrics: {
        activos,
        pausados,
        promedioAvance,
        completados,
        categoryProgress,
        categoryData: {
          labels: categoryLabels,
          counts: categoryCounts,
          avgs: categoryAvgs
        },
        areaData: topAreas,
        responsibleData
      }
    });
  } catch (err) {
    console.error('Error loading dashboard data:', err);
    res.status(500).send('Error cargando el resumen.');
  }
});

module.exports = router;

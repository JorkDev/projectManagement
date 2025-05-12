// -------------------
// Imports and router setup
// -------------------

/**
 * @file Defines routes for report viewing, uploading, and PDF generation:
 *   - Public PDF view: GET /view/pdf/:category
 *   - Protected report listings and uploads under /reports
 *   - PDF generation via Puppeteer: GET /reports/pdf/:category
 */

const express = require('express');                                  // Express framework
const router = express.Router();                                     // Create a modular router
const db = require('../config/db');                                  // MySQL database connection
const axios = require('axios');                                      // HTTP client for external API
const authenticateJWT = require('../middleware/authenticateJWT');    // JWT authentication middleware
const { uploadGlobal, uploadUser } = require('../utils/reportUploader'); // Multer upload handlers
const puppeteer = require('puppeteer');                              // Headless browser for PDF generation

// Dummy users map for list/upload views
const users = {
  VJA001: 'JULCA', JRB001: 'RECOBA', KVA001: 'VALVERDE', MSA001: 'SEMINARIO',
  ERA001: 'ROJAS', LJP001: 'JARA', WAC001: 'ARGOTE', LQM001: 'QUINTANA',
  WOC001: 'OSORIO', GCC003: 'CHAVEZ', EJQ001: 'JAREZ'
};

// Predefined area options for rendering
const areaOptions = [
  { code: '001', name: 'DIRECTORIO' }, { code: '002', name: 'ADMINISTRACION' },
  { code: '003', name: 'CALIDAD' },    { code: '004', name: 'SISTEMAS' },
  { code: '005', name: 'OPERACIONES' },{ code: '006', name: 'SERVICIO AL CLIENTE' },
  { code: '008', name: 'ARMADO' },     { code: '009', name: 'ARCHIVO' },
  { code: '010', name: 'TRANSPORTE' }, { code: '014', name: 'MENSAJERIA' },
  { code: '015', name: 'CONTABILIDAD' },{ code: '016', name: 'VISTO BUENO' },
  { code: '017', name: 'TECNICA LEGAL' },{ code: '018', name: 'RR.HH.' },
  { code: '019', name: 'GERENCIA GENERAL' },{ code: '023', name: 'CATALOGO' },
  { code: '024', name: 'COMERCIAL' },   { code: '027', name: 'PRODUCCION' },
  { code: '028', name: 'SERVICIO AL CLIENTE' },{ code: '033', name: 'SOPORTE OPERATIVO' },
  { code: '036', name: 'OPERACIONES' }
];

// Category configuration: title, description, table columns, and key mappings
const categoryConfig = {
  cartera1: {
    title: 'Cartera #1',
    categoryDesc: 'Esta categoría presenta un conjunto de iniciativas orientadas a mejorar y automatizar procesos logísticos, documentarios y de control dentro de la operación.',
    columns: ['ID','Requerimiento','Prioridad','Solicitante','Responsable','Avance','Producción'],
    columnKeyMap: {
      ID: 'id', Requerimiento: 'title', Prioridad: 'priority',
      Solicitante: 'applicant', Responsable: 'responsible',
      Avance: 'progress_percentage', Producción: 'prod'
    }
  },
  cartera2: {
    title: 'Cartera #2',
    categoryDesc: 'Esta categoría reúne iniciativas enfocadas en la mejora del control documental, automatización de procesos aduaneros y gestión logística especializada.',
    columns: ['ID','Requerimiento','Prioridad','Solicitante','Responsable','Fecha Inicio','Fecha Término','Avance','Producción'],
    columnKeyMap: {
      ID: 'id', Requerimiento: 'title', Prioridad: 'priority',
      Solicitante: 'applicant', Responsable: 'responsible',
      'Fecha Inicio': 'start_date','Fecha Término':'end_date',
      Avance: 'progress_percentage', Producción: 'prod'
    }
  },
  'proyectos-ti': {
    title: 'Proyectos TI',
    categoryDesc: 'Esta categoría agrupa iniciativas enfocadas en la mejora de la infraestructura tecnológica, conectividad y contingencia.',
    columns: ['ID','Requerimiento','Prioridad','Solicitante','Responsable','Avance'],
    columnKeyMap: {
      ID: 'id', Requerimiento: 'title', Prioridad: 'priority',
      Solicitante: 'applicant', Responsable: 'responsible',
      Avance: 'progress_percentage'
    }
  },
  'isco-cargo': {
    title: 'ISCO Cargo',
    categoryDesc: 'Esta categoría agrupa iniciativas enfocadas en la mejora de la infraestructura tecnológica y estandarización de sistemas.',
    columns: ['ID','Requerimiento','Prioridad','Solicitante','Responsable','Avance'],
    columnKeyMap: {
      ID:'id', Requerimiento:'title', Prioridad:'priority',
      Solicitante:'applicant', Responsable:'responsible',
      Avance:'progress_percentage'
    }
  }
};

// -------------------
// Public PDF View Route
// -------------------

/**
 * GET /view/pdf/:category
 * @name PdfViewCategory
 * @description
 *   Renders an HTML view of projects in a category suitable for PDF conversion.
 *
 * @param {Request}  req  - Express request with `req.params.category`
 * @param {Response} res  - Express response
 * @param {Function} next - Express next middleware
 * @async
 */
router.get('/view/pdf/:category', async (req, res, next) => {
  const cat = req.params.category;
  const config = categoryConfig[cat];
  if (!config) return res.status(404).send('Categoría no encontrada.');

  try {
    const [projects] = await db.execute(
      'SELECT * FROM pms_projects WHERE category = ? ORDER BY id DESC',
      [cat]
    );
    const { data } = await axios.get(
      `${process.env.API_URL}?KEY=${process.env.ORACLE_API_KEY}`
    );
    const allUsers = data.data;
    const userMap = new Map(allUsers.map(u => [u.cod_ascinsa, `${u.pnombre} ${u.apaterno}`]));

    const processed = projects.map(p => {
      if (p.applicant) {
        p.applicantNames = p.applicant
          .split(',').map(c => c.trim()).map(c => userMap.get(c) || c).join(', ');
      }
      if (p.responsible) {
        let codes;
        try { codes = JSON.parse(p.responsible); if (!Array.isArray(codes)) codes = [codes]; }
        catch { codes = p.responsible.split(',').map(c => c.trim()); }
        p.responsibleCodes = codes;
        p.responsibleNames = codes.map(c => userMap.get(c) || c).join(', ');
      }
      return p;
    });

    res.render('pdfReports/category', {
      categoryTitle: config.title,
      categoryParam: cat,
      categoryDesc: config.categoryDesc,
      columns: config.columns,
      columnKeyMap: config.columnKeyMap,
      areaOptions,
      projects: processed,
      users: allUsers
    });
  } catch (err) {
    next(err);
  }
});

// -------------------
// Protect Remaining Routes
// -------------------

router.use(authenticateJWT);

// -------------------
// Global Reports Routes
// -------------------

/**
 * GET /reports
 * @name RedirectToGlobal
 * @description
 *   Redirects /reports to the global reports listing.
 */
router.get('/', (req, res) => {
  res.redirect('/reports/global');
});

/**
 * GET /reports/global
 * @name ListGlobalReports
 * @description
 *   Lists all global reports (no user_code) in descending date order.
 */
router.get('/global', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM pms_reports WHERE user_code IS NULL ORDER BY report_date DESC'
    );
    res.render('reports/global', {
      rows,
      success_msg: req.flash('success'),
      error_msg: req.flash('error')
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error al cargar los reportes globales');
    res.redirect('/');
  }
});

/**
 * GET /reports/global/upload
 * @name ShowGlobalUploadForm
 * @description
 *   Renders upload form for global reports (admin only).
 */
router.get('/global/upload', (req, res) => {
  if (!req.session.user?.isAdmin) {
    req.flash('error', 'No tienes permiso para realizar esta acción.');
    return res.redirect('/reports/global');
  }
  res.render('reports/upload-global', {
    success_msg: req.flash('success'),
    error_msg: req.flash('error')
  });
});

/**
 * POST /reports/global/upload
 * @name UploadGlobalReport
 * @description
 *   Handles upload of a global report file and stores metadata.
 */
router.post(
  '/global/upload',
  uploadGlobal.single('report_file'),
  async (req, res) => {
    if (!req.session.user?.isAdmin) {
      req.flash('error', 'No tienes permiso para realizar esta acción.');
      return res.redirect('/reports/global');
    }
    try {
      const { report_date } = req.body;
      await db.execute(
        `INSERT INTO pms_reports (report_date, file_name, original_name)
           VALUES (?, ?, ?)`,
        [report_date, req.file.filename, req.file.originalname]
      );
      req.flash('success', 'Reporte global subido.');
      res.redirect('/reports/global');
    } catch (err) {
      console.error(err);
      req.flash('error', 'Error al subir el reporte global.');
      res.redirect('/reports/global');
    }
  }
);

// -------------------
// Individual Reports Routes
// -------------------

/**
 * GET /reports/my
 * @name ListIndividualReports
 * @description
 *   Lists individual reports; admins see all, others see own reports.
 */
router.get('/my', async (req, res) => {
  try {
    const isAdmin = req.session.user.isAdmin;
    const sql = isAdmin
      ? 'SELECT * FROM pms_reports ORDER BY report_date DESC'
      : 'SELECT * FROM pms_reports WHERE user_code = ? ORDER BY report_date DESC';
    const params = isAdmin ? [] : [req.session.user.cod_ascinsa];
    const [rows] = await db.execute(sql, params);
    res.render('reports/individual', {
      rows,
      success_msg: req.flash('success'),
      error_msg: req.flash('error')
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error al cargar tus reportes.');
    res.redirect('/');
  }
});

/**
 * GET /reports/my/upload
 * @name ShowIndividualUploadForm
 * @description
 *   Renders upload form for individual reports.
 */
router.get('/my/upload', (req, res) => {
  res.render('reports/upload-individual', {
    success_msg: req.flash('success'),
    error_msg: req.flash('error'),
    users
  });
});

/**
 * POST /reports/my/upload
 * @name UploadIndividualReport
 * @description
 *   Handles upload of an individual report file and stores metadata.
 */
router.post(
  '/my/upload',
  uploadUser.single('report_file'),
  async (req, res) => {
    try {
      const { report_date, user_code } = req.body;
      if (!user_code) {
        req.flash('error', 'Debes seleccionar un responsable.');
        return res.redirect('/reports/my/upload');
      }
      await db.execute(
        `INSERT INTO pms_reports (user_code, report_date, file_name, original_name)
           VALUES (?, ?, ?, ?)`,
        [user_code, report_date, req.file.filename, req.file.originalname]
      );
      req.flash('success', 'Reporte subido correctamente.');
      res.redirect('/reports/my');
    } catch (err) {
      console.error(err);
      req.flash('error', 'Error al subir tu reporte.');
      res.redirect('/reports/my/upload');
    }
  }
);

// -------------------
// PDF Generation Helper
// -------------------

/**
 * makePdf
 * @name makePdf
 * @description
 *   Uses Puppeteer to navigate to a URL (with optional cookies) and generate a PDF buffer.
 *
 * @param {string} url           - The page URL to convert to PDF
 * @param {string} [cookieHeader] - Optional raw Cookie header string
 * @returns {Buffer}             - PDF data buffer
 */
async function makePdf(url, cookieHeader) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page    = await browser.newPage();
  if (cookieHeader) {
    await page.setExtraHTTPHeaders({ Cookie: cookieHeader });
  }
  await page.goto(url, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: 0,
    displayHeaderFooter: false
  });
  await browser.close();
  return pdf;
}

/**
 * GET /reports/pdf/:category
 * @name GeneratePdfReport
 * @description
 *   Protected route that generates and streams an inline PDF for the given category.
 */
router.get('/pdf/:category', async (req, res, next) => {
  const cat = req.params.category;
  const url = `${req.protocol}://${req.get('host')}/reports/view/pdf/${cat}`;
  try {
    const pdfBuf = await makePdf(url, req.headers.cookie);
    res
      .type('application/pdf')
      .set('Content-Disposition', `inline; filename="${cat}-report.pdf"`)
      .send(pdfBuf);
  } catch (e) {
    next(e);
  }
});

// -------------------
// Export the router
// -------------------

/**
 * Exports this router module so it can be mounted in `app.js`:
 *
 *   const reportsRouter = require('./routes/reportsRoutes');
 *   app.use('/reports', reportsRouter);
 */
module.exports = router;

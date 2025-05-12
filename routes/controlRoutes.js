// -------------------
// Imports, constants, and router setup
// -------------------

/**
 * @file Defines CRUD routes for internal control items:
 *   - GET /             → list all items
 *   - GET /create       → show creation form
 *   - POST /create      → create a new item
 *   - GET /:id          → show item detail
 *   - GET /:id/edit     → show edit form
 *   - POST /:id/edit    → update item
 *   - POST /:id/delete  → delete item
 */

const express = require('express');                     // Express framework
const router = express.Router();                        // Create a modular router
const db = require('../config/db');                     // MySQL database connection
const axios = require('axios');                         // HTTP client for external API calls
const { logActivity } = require('../utils/loggerUtility'); // Activity logger utility

// Predefined select options for forms
const classifierOptions = [
  'Base de Datos',
  'Comunicaciones',
  'Contingencia',
  'Energía',
  'Infraestructura',
  'Redes',
  'Software',
  'Soluciones',
  'Terminales'
];

const subClassifierOptions = [
  'Aire Acondicionado',
  'Antispam',
  'Antivirus',
  'Aplicaciones',
  'Backups',
  'Correo',
  'Datos',
  'Estabilizador',
  'IPS',
  'Laptops',
  'Licencias',
  'Ofimática',
  'Seguridad',
  'Servidores',
  'SIG',
  'Switches',
  'UPS'
];

const locationOptions = ['Talara', 'Oquendo', 'Ambas Sedes'];

const floorOptions = [
  { value: 0, label: 'Todos' },
  { value: 1, label: 'Piso 1' },
  { value: 3, label: 'Piso 3' },
  { value: 4, label: 'Piso 4' }
];

const priorityOptions = [
  { value: 1, label: 'Alta' },
  { value: 2, label: 'Media' },
  { value: 3, label: 'Baja' },
  { value: 4, label: 'Rechazado' },
  { value: 5, label: 'Ajuste' },
  { value: 6, label: 'Stand By' }
];

const areaOptions = ['Sistemas'];

// -------------------
// Routes
// -------------------

/**
 * GET /
 * @name ListItems
 * @description
 *   Fetches all internal control items ordered by descending ID and renders the list view.
 *
 * @param {Request} req  - Express request object
 * @param {Response} res - Express response object
 * @async
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM pms_internal_controls ORDER BY id DESC'
    );
    res.render('control/item-list', {
      title: 'Lista de Ítems',
      activePage: 'control',
      controls: rows
    });
  } catch (err) {
    console.error('Error fetching internal controls:', err);
    res.status(500).send('Error al cargar la lista de ítems');
  }
});

/**
 * GET /create
 * @name ShowCreateForm
 * @description
 *   Prepares and renders the "create new item" form, including select options
 *   and filtered user lists from external API.
 *
 * @param {Request} req  - Express request object
 * @param {Response} res - Express response object
 * @async
 */
router.get('/create', async (req, res) => {
  try {
    const { data } = await axios.get(
      `${process.env.API_URL}?KEY=${process.env.ORACLE_API_KEY}`
    );
    const allUsers = data.data;
    const solicitantes = allUsers.filter(
      u => u.puesto?.toUpperCase().includes('JEFE DE SISTEMAS')
    );
    const responsibles = allUsers.filter(u => u.area === '004');

    res.render('control/item-create', {
      title: 'Crear un Ítem',
      activePage: 'control',
      classifierOptions,
      subClassifierOptions,
      locationOptions,
      floorOptions,
      priorityOptions,
      areaOptions,
      solicitantes,
      responsibles
    });
  } catch (err) {
    console.error('Error preparing create form:', err);
    res.status(500).send('Error cargando el formulario de creación');
  }
});

/**
 * POST /create
 * @name CreateItem
 * @description
 *   Inserts a new control item into the database, logs the creation,
 *   and redirects back to the list on success.
 *
 * @param {Request} req
 *   @property {string}  req.body.requirement
 *   @property {string}  req.body.classifier
 *   @property {string}  req.body.subclassifier
 *   @property {number}  req.body.quantity
 *   @property {string}  req.body.location
 *   @property {number}  req.body.floor
 *   @property {string}  req.body.detail
 *   @property {number}  req.body.priority
 *   @property {string}  req.body.area
 *   @property {string}  req.body.applicant
 *   @property {string|string[]} req.body.responsible_ti
 *   @property {string|null}   req.body.approximate_end_date
 *   @property {number}        req.body.progress_percentage
 *   @property {string}        req.body.observations
 *   @property {string}        req.body.iframe
 * @param {Response} res - Express response object
 * @async
 */
router.post('/create', async (req, res) => {
  const {
    requirement,
    classifier,
    subclassifier,
    quantity,
    location,
    floor,
    detail,
    priority,
    area,
    applicant,
    responsible_ti,
    approximate_end_date,
    progress_percentage,
    observations,
    iframe
  } = req.body;

  const responsibleVal = Array.isArray(responsible_ti)
    ? responsible_ti.join(',')
    : responsible_ti;

  const values = [
    requirement,
    classifier,
    subclassifier,
    quantity,
    location,
    floor,
    detail,
    priority,
    area,
    applicant,
    responsibleVal,
    approximate_end_date || null,
    progress_percentage,
    observations,
    iframe
  ];

  try {
    await db.execute(
      `INSERT INTO pms_internal_controls (
         requirement, classifier, subclassifier, quantity,
         location, floor, detail,
         priority, area, applicant, responsible_ti,
         approximate_end_date, progress_percentage, observations,
         iframe, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      values
    );

    await logActivity(
      req.session.user.fullName,
      `creó un nuevo ítem de control: "${requirement}"`,
      `Detalles: Clasificador: ${classifier}, Subclasificador: ${subclassifier}, Prioridad: ${priority}, Responsable: ${responsibleVal}`
    );

    req.flash('success', 'Ítem creado exitosamente');
    res.redirect('/control');
  } catch (err) {
    console.error('Error inserting item:', err);
    req.flash('error', 'Error al crear el ítem');
    res.redirect('/control/create');
  }
});

/**
 * GET /:id
 * @name ShowItemDetail
 * @description
 *   Fetches a single control item by ID and renders its detail view.
 *
 * @param {Request} req  - Express request object
 * @param {Response} res - Express response object
 * @async
 */
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM pms_internal_controls WHERE id = ? LIMIT 1',
      [req.params.id]
    );

    if (!rows.length) {
      req.flash('error', 'Ítem no encontrado');
      return res.redirect('/control');
    }

    res.render('control/item-detail', {
      title: 'Detalle de Ítem',
      activePage: 'control',
      item: rows[0]
    });
  } catch (err) {
    console.error('Error fetching item detail:', err);
    req.flash('error', 'Error cargando el detalle');
    res.redirect('/control');
  }
});

/**
 * GET /:id/edit
 * @name ShowEditForm
 * @description
 *   Fetches the item to edit, repopulates select options and user lists,
 *   and renders the edit form.
 *
 * @param {Request} req  - Express request object
 * @param {Response} res - Express response object
 * @async
 */
router.get('/:id/edit', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM pms_internal_controls WHERE id = ? LIMIT 1',
      [req.params.id]
    );

    if (!rows.length) {
      req.flash('error', 'Ítem no encontrado');
      return res.redirect('/control');
    }

    const item = rows[0];
    const { data } = await axios.get(
      `${process.env.API_URL}?KEY=${process.env.ORACLE_API_KEY}`
    );
    const allUsers = data.data;
    const solicitantes = allUsers.filter(
      u => u.puesto?.toUpperCase().includes('JEFE DE SISTEMAS')
    );
    const responsibles = allUsers.filter(u => u.area === '004');

    res.render('control/item-edit', {
      title: 'Editar Ítem',
      activePage: 'control',
      item,
      classifierOptions,
      subClassifierOptions,
      locationOptions,
      floorOptions,
      priorityOptions,
      areaOptions,
      solicitantes,
      responsibles
    });
  } catch (err) {
    console.error('Error loading item for edit:', err);
    req.flash('error', 'Error al cargar el ítem para edición');
    res.redirect('/control');
  }
});

/**
 * POST /:id/edit
 * @name UpdateItem
 * @description
 *   Updates an existing control item, logs any changes, and redirects.
 *
 * @param {Request} req
 *   @property {string}  req.body.requirement
 *   @property {string}  req.body.classifier
 *   @property {string}  req.body.subclassifier
 *   @property {number}  req.body.quantity
 *   @property {string}  req.body.location
 *   @property {number}  req.body.floor
 *   @property {string}  req.body.detail
 *   @property {number}  req.body.priority
 *   @property {string}  req.body.area
 *   @property {string}  req.body.applicant
 *   @property {string|string[]} req.body.responsible_ti
 *   @property {string|null}   req.body.approximate_end_date
 *   @property {number}        req.body.progress_percentage
 *   @property {string}        req.body.observations
 *   @property {string}        req.body.iframe
 * @param {Response} res - Express response object
 * @async
 */
router.post('/:id/edit', async (req, res) => {
  const {
    requirement,
    classifier,
    subclassifier,
    quantity,
    location,
    floor,
    detail,
    priority,
    area,
    applicant,
    responsible_ti,
    approximate_end_date,
    progress_percentage,
    observations,
    iframe
  } = req.body;

  const [[old]] = await db.execute(
    'SELECT * FROM pms_internal_controls WHERE id = ?',
    [req.params.id]
  );

  if (!old) {
    req.flash('error', 'Ítem no encontrado');
    return res.redirect('/control');
  }

  const responsibleVal = Array.isArray(responsible_ti)
    ? responsible_ti.join(',')
    : responsible_ti;

  // Build list of changes
  const changes = [];
  if (old.requirement !== requirement) changes.push(`- Requerimiento de "${old.requirement}" a "${requirement}"`);
  if (old.classifier   !== classifier)   changes.push(`- Clasificador de "${old.classifier}" a "${classifier}"`);
  if (old.subclassifier!== subclassifier)changes.push(`- Subclasificador de "${old.subclassifier}" a "${subclassifier}"`);
  if (`${old.quantity}` !== `${quantity}`)changes.push(`- Cantidad de "${old.quantity}" a "${quantity}"`);
  if (old.location     !== location)     changes.push(`- Ubicación de "${old.location}" a "${location}"`);
  if (old.floor        !== floor)        changes.push(`- Piso de "${old.floor}" a "${floor}"`);
  if (old.detail       !== detail)       changes.push(`- Detalle de "${old.detail}" a "${detail}"`);
  if (`${old.priority}` !== `${priority}`)changes.push(`- Prioridad de "${old.priority}" a "${priority}"`);
  if (old.area         !== area)         changes.push(`- Área de "${old.area}" a "${area}"`);
  if (old.applicant    !== applicant)    changes.push(`- Solicitante de "${old.applicant}" a "${applicant}"`);
  if (old.responsible_ti !== responsibleVal) changes.push(`- Responsable TI de "${old.responsible_ti}" a "${responsibleVal}"`);
  if (old.approximate_end_date !== approximate_end_date) changes.push(`- Fecha aprox. de fin de "${old.approximate_end_date}" a "${approximate_end_date}"`);
  if (`${old.progress_percentage}` !== `${progress_percentage}`) changes.push(`- Progreso de "${old.progress_percentage}" a "${progress_percentage}"`);
  if (old.observations  !== observations) changes.push(`- Observaciones de "${old.observations}" a "${observations}"`);
  if (old.iframe        !== iframe)       changes.push(`- Iframe de "${old.iframe}" a "${iframe}"`);

  const values = [
    requirement || null,
    classifier   || null,
    subclassifier|| null,
    quantity     || 0,
    location     || null,
    floor        || null,
    detail       || null,
    priority     || null,
    area         || null,
    applicant    || null,
    responsibleVal,
    approximate_end_date|| null,
    progress_percentage|| 0,
    observations || null,
    iframe       || null,
    req.params.id
  ];

  try {
    await db.execute(
      `UPDATE pms_internal_controls
         SET requirement = ?, classifier = ?, subclassifier = ?, quantity = ?,
             location = ?, floor = ?, detail = ?,
             priority = ?, area = ?, applicant = ?, responsible_ti = ?,
             approximate_end_date = ?, progress_percentage = ?, observations = ?,
             iframe = ?, updated_at = NOW()
       WHERE id = ?`,
      values
    );

    if (changes.length) {
      await logActivity(
        req.session.user.fullName,
        `editó el ítem de control con ID ${req.params.id}`,
        changes.join('\n')
      );
    }

    req.flash('success', 'Ítem actualizado correctamente');
    res.redirect('/control');
  } catch (err) {
    console.error('Error updating item:', err);
    req.flash('error', 'Error al actualizar el ítem');
    res.redirect(`/control/${req.params.id}/edit`);
  }
});

/**
 * POST /:id/delete
 * @name DeleteItem
 * @description
 *   Deletes a control item by ID, logs the deletion, and redirects.
 *
 * @param {Request} req  - Express request object
 * @param {Response} res - Express response object
 * @async
 */
router.post('/:id/delete', async (req, res) => {
  try {
    const [[item]] = await db.execute(
      'SELECT requirement FROM pms_internal_controls WHERE id = ?',
      [req.params.id]
    );

    if (!item) {
      req.flash('error', 'Ítem no encontrado');
      return res.redirect('/control');
    }

    await db.execute('DELETE FROM pms_internal_controls WHERE id = ?', [
      req.params.id
    ]);

    await logActivity(
      req.session.user.fullName,
      `eliminó el ítem de control: "${item.requirement}"`,
      `ID del ítem: ${req.params.id}`
    );

    req.flash('success', 'Ítem eliminado correctamente');
    res.redirect('/control');
  } catch (err) {
    console.error('Error deleting item:', err);
    req.flash('error', 'Error al eliminar el ítem');
    res.redirect('/control');
  }
});

// -------------------
// Export the router
// -------------------

/**
 * Exports this router module so it can be mounted in `app.js`:
 *
 *   const controlRouter = require('./routes/control');
 *   app.use('/control', controlRouter);
 */
module.exports = router;

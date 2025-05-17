// -------------------
// Imports and router setup
// -------------------

/**
 * @file Defines routes for project and task management, including:
 *   - CRUD for projects by category
 *   - Task management and hours logging
 *   - File attachments and comments
 *   - Authentication via middleware
 */

const express = require('express'); // Express framework
const router = express.Router(); // Create a modular router
const db = require('../config/db'); // MySQL database connection
const authenticateJWT = require('../middleware/authenticateJWT'); // JWT auth middleware
const axios = require('axios'); // HTTP client for external API
const path = require('path'); // File path utilities
const multer = require('multer'); // File upload middleware
const { logAction } = require('../middleware/logActivity'); // Route-level logging middleware
const { logActivity } = require('../utils/loggerUtility'); // Utility to log actions

// Configure multer for project uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads/projects'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  }
});
const upload = multer({ storage });

// Predefined area options for projects
const areaOptions = [
  { code: '001', name: 'DIRECTORIO' },
  { code: '002', name: 'ADMINISTRACION' },
  { code: '003', name: 'CALIDAD' },
  { code: '004', name: 'SISTEMAS' },
  { code: '005', name: 'OPERACIONES' },
  { code: '006', name: 'SERVICIO AL CLIENTE' },
  { code: '008', name: 'ARMADO' },
  { code: '009', name: 'ARCHIVO' },
  { code: '010', name: 'TRANSPORTE' },
  { code: '014', name: 'MENSAJERIA' },
  { code: '015', name: 'CONTABILIDAD' },
  { code: '016', name: 'VISTO BUENO' },
  { code: '017', name: 'TECNICA LEGAL' },
  { code: '018', name: 'RR.HH.' },
  { code: '019', name: 'GERENCIA GENERAL' },
  { code: '023', name: 'CATALOGO' },
  { code: '024', name: 'COMERCIAL' },
  { code: '027', name: 'PRODUCCION' },
  { code: '028', name: 'SERVICIO AL CLIENTE' },
  { code: '033', name: 'SOPORTE OPERATIVO' },
  { code: '036', name: 'OPERACIONES' }
];

// Configuration per project category: titles, columns, and key mappings
const categoryConfig = {
  cartera1: {
    title: 'Cartera #1',
    categoryDesc: 'Esta categoría presenta un conjunto de iniciativas orientadas a mejorar y automatizar procesos logísticos, documentarios y de control dentro de la operación.  A nivel general, los proyectos reflejan un enfoque en la digitalización, cumplimiento normativo, trazabilidad operativa y mejoras en la eficiencia interna, con desarrollos tanto propios como adaptados a las necesidades específicas de clientes y normativas vigentes.',
    columns: [
      'ID',
      'Requerimiento',
      'Prioridad',
      'Estado',
      'Solicitante',
      'Responsable',
      'Avance',
      'Producción'
    ],
    columnKeyMap: {
      ID: 'id',
      Requerimiento: 'title',
      Descripción: 'detail',
      Prioridad: 'priority',
      Estado: 'status',
      Área: 'area',
      Solicitante: 'applicant',
      Responsable: 'responsible',
      Avance: 'progress_percentage',
      Producción: 'prod',
      Observaciones: 'observations'
    }
  },
  cartera2: {
    title: 'Cartera #2',
    categoryDesc: 'Esta categoría reúne iniciativas enfocadas en la mejora del control documental, automatización de procesos aduaneros y gestión logística especializada. Se prioriza la transmisión digital a SUNAT, la emisión de alertas, el fortalecimiento del sistema de transporte y la adaptación a cambios de plataformas de clientes, asegurando eficiencia, trazabilidad y cumplimiento normativo de forma integrada.',
    columns: [
      'ID',
      'Requerimiento',
      'Prioridad',
      'Estado',
      'Solicitante',
      'Responsable',
      'Avance',
      'Producción'
    ],
    columnKeyMap: {
      ID: 'id',
      Requerimiento: 'title',
      Descripción: 'detail',
      Prioridad: 'priority',
      Área: 'area',
      Estado: 'status',
      Solicitante: 'applicant',
      Responsable: 'responsible',
      'Fecha Inicio': 'start_date',
      'Fecha Término': 'end_date',
      Avance: 'progress_percentage',
      Producción: 'prod'
    }
  },
  'proyectos-ti': {
    title: 'Proyectos TI',
    categoryDesc: 'Esta categoría agrupa iniciativas enfocadas en la mejora de la infraestructura tecnológica, conectividad, contingencia y estandarización de sistemas. Los proyectos buscan fortalecer la disponibilidad de servicios, asegurar continuidad operativa, elevar la seguridad de red y bases de datos, así como normalizar estructuras y accesos para una gestión más robusta, escalable y alineada a buenas prácticas.',
    columns: [
      'ID',
      'Requerimiento',
      'Prioridad',
      'Estado',
      'Solicitante',
      'Responsable',
      'Avance'
    ],
    columnKeyMap: {
      ID: 'id',
      Requerimiento: 'title',
      Descripción: 'detail',
      Riesgo: 'risk',
      Consecuencia: 'consequence',
      Clasificador: 'classifier',
      Subclasificador: 'subclassifier',
      Ubicación: 'location',
      Estado: 'status',
      Piso: 'floor',
      Prioridad: 'priority',
      Área: 'area',
      Solicitante: 'applicant',
      Responsable: 'responsible',
      'Fecha Inicio': 'start_date',
      'Fecha Término': 'end_date',
      Avance: 'progress_percentage',
      Observaciones: 'observations'
    }
  },
  'isco-cargo': {
    title: 'ISCO Cargo',
    categoryDesc: 'Esta categoría reúne actividades operativas y técnicas destinadas a la implementación, configuración y mantenimiento de sistemas administrativos, de facturación y bases de datos. Abarca desde instalaciones en equipos individuales hasta la creación de usuarios y capacitación, buscando garantizar la funcionalidad integral del sistema, la trazabilidad documental y la conexión efectiva con entidades externas como SUNAT.',
    columns: [
      'ID',
      'Requerimiento',
      'Prioridad',
      'Estado',
      'Solicitante',
      'Responsable',
      'Avance'
    ],
    columnKeyMap: {
      ID: 'id',
      Requerimiento: 'title',
      Descripción: 'detail',
      Prioridad: 'priority',
      Área: 'area',
      Estado: 'status',
      Solicitante: 'applicant',
      Responsable: 'responsible',
      'Fecha Inicio': 'start_date',
      'Fecha Término': 'end_date',
      Avance: 'progress_percentage'
    }
  }
};

// Apply authentication to all routes
router.use(authenticateJWT);

// -------------------
// List projects by category
// -------------------

/**
 * GET /:category
 * @name ListProjectsByCategory
 * @description
 *   Renders a table of projects for the given category, processing user codes into names.
 *
 * @param {Request}  req  - Express request with `req.params.category`
 * @param {Response} res  - Express response
 * @async
 */
router.get('/:category', async (req, res) => {
  const catParam = req.params.category.toLowerCase();
  const config = categoryConfig[catParam];
  if (!config)
    return res.status(404).send('Categoría de proyecto no encontrada.');

  try {
    const [projects] = await db.execute(
      'SELECT * FROM pms_projects WHERE category = ? ORDER BY id DESC',
      [catParam]
    );
    const response = await axios.get(
      `${process.env.API_URL}?KEY=${process.env.ORACLE_API_KEY}`
    );
    const allUsers = response.data.data;

    // Map applicant and responsible codes to names
    const userMap = new Map();
    allUsers.forEach((user) => {
      userMap.set(user.cod_ascinsa, `${user.pnombre} ${user.apaterno}`);
    });
    const processedProjects = projects.map((project) => {
      if (project.applicant) {
        project.applicantNames = project.applicant
          .split(',')
          .map((code) => code.trim())
          .map((code) => userMap.get(code) || code)
          .join(', ');
      }
      if (project.responsible) {
        let codes;
        try {
          const parsed = JSON.parse(project.responsible);
          codes = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          codes = project.responsible.split(',').map((c) => c.trim());
        }
        project.responsibleNames = codes
          .map((code) => userMap.get(code) || code)
          .join(', ');
        project.responsibleCodes = codes;
      }
      return project;
    });

    res.render('project/project-category', {
      categoryTitle: config.title,
      categoryParam: catParam,
      categoryDesc: config.categoryDesc,
      projects: processedProjects,
      columns: config.columns,
      columnKeyMap: config.columnKeyMap,
      areaOptions,
      users: allUsers,
      success_msg: req.flash('success'),
      error_msg: req.flash('error'),
      csrfToken: req.csrfToken ? req.csrfToken() : null,
      isAdmin: req.session.user?.isAdmin,
      isAreaWorker: req.session.user?.isAreaWorker,
      onlyView: req.session.user?.onlyView
    });
  } catch (err) {
    console.error('Error loading projects:', err);
    res.status(500).send('Error al cargar los proyectos.');
  }
});

// -------------------
// Show project creation form
// -------------------

/**
 * GET /:category/create
 * @name ShowProjectCreateForm
 * @description
 *   Renders the form to create a new project in the specified category.
 *
 * @param {Request}  req  - Express request with `req.params.category`
 * @param {Response} res  - Express response
 * @async
 */
router.get('/:category/create', async (req, res) => {
  const catParam = req.params.category.toLowerCase();
  const config = categoryConfig[catParam];
  if (!config)
    return res.status(404).send('Categoría de proyecto no encontrada.');
  if (!req.session.user?.isAdmin) {
    req.flash('error', 'No tienes permiso para realizar esta acción.');
    return res.redirect('back');
  }

  try {
    const { data } = await axios.get(
      `${process.env.API_URL}?KEY=${process.env.ORACLE_API_KEY}`
    );
    const allUsers = data.data;
    const users = allUsers.filter((u) => u.area === '004' && u.puesto);
    const solicitantes = allUsers.filter(
      (u) =>
        u.puesto &&
        (u.puesto.toUpperCase().includes('JEFE') ||
          u.puesto.toUpperCase().includes('GERENTE') ||
          u.puesto.toUpperCase() === 'EJECUTIVO DE PROYECTOS')
    );

    res.render('project/project-create', {
      categoryTitle: config.title,
      categoryParam: catParam,
      categoryDesc: config.categoryDesc,
      columnKeyMap: config.columnKeyMap,
      areaOptions,
      users,
      solicitantes,
      isAdmin: true,
      pageTitle: 'Crear Proyecto'
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).send('Error al cargar los usuarios.');
  }
});

// -------------------
// Create a new project
// -------------------

/**
 * POST /:category/create
 * @name CreateProject
 * @description
 *   Inserts a new project record into the database and logs the action.
 *
 * @param {Request}  req  - Express request with `req.params.category` and form fields
 * @param {Response} res  - Express response
 * @async
 */
router.post('/:category/create', async (req, res) => {
  const { category } = req.params;
  const {
    title,
    detail,
    risk,
    consequence,
    classifier,
    subclassifier,
    location,
    floor,
    priority,
    area,
    applicant,
    responsible,
    start_date,
    end_date,
    due_date,
    status
  } = req.body;

  try {
    const responsibleVal = Array.isArray(responsible)
      ? JSON.stringify(responsible)
      : responsible;
    const projectData = {
      category,
      title,
      detail,
      risk: risk || null,
      consequence: consequence || null,
      classifier: classifier || null,
      subclassifier: subclassifier || null,
      location: location || null,
      floor: floor ? parseInt(floor, 10) : null,
      priority,
      area: area || null,
      applicant,
      responsible: responsibleVal,
      start_date: start_date || null,
      end_date: end_date || null,
      due_date: due_date || null,
      status: status || 'pendiente',
      created_at: new Date(),
      updated_at: new Date()
    };

    const cols = Object.keys(projectData);
    const vals = Object.values(projectData);
    const placeholders = cols.map(() => '?').join(', ');

    await db.execute(
      `INSERT INTO pms_projects (${cols.join(', ')}) VALUES (${placeholders})`,
      vals
    );

    await logActivity(
      req.session.user.fullName,
      `creó un nuevo proyecto "${title}"`,
      `Categoría: ${category}`
    );

    req.flash('success', 'Proyecto creado correctamente');
    res.redirect(`/projects/${category}`);
  } catch (err) {
    console.error('Error creating project:', err);
    req.flash('error', 'Error al crear el proyecto');
    res.redirect(`/projects/${category}/create`);
  }
});

// -------------------
// Project detail view
// -------------------

/**
 * GET /:category/:id
 * @name ProjectDetail
 * @description
 *   Fetches project data, tasks, files, and comments, then renders the detail view.
 *
 * @param {Request}  req  - Express request with `req.params.category` and `req.params.id`
 * @param {Response} res  - Express response
 * @async
 */
router.get('/:category/:id', async (req, res) => {
  const catParam = req.params.category.toLowerCase();
  const projectId = req.params.id;
  const config = categoryConfig[catParam];
  if (!config)
    return res.status(404).send('Categoría de proyecto no encontrada.');

  try {
    const [[project]] = await db.execute(
      'SELECT * FROM pms_projects WHERE category = ? AND id = ? LIMIT 1',
      [catParam, projectId]
    );
    if (!project) return res.status(404).send('Proyecto no encontrado.');

    const [tasks] = await db.execute(
      'SELECT * FROM pms_tasks WHERE project_id = ?',
      [projectId]
    );
    project.tasks = tasks;

    const [files] = await db.execute(
      'SELECT * FROM pms_project_attachments WHERE project_id = ?',
      [projectId]
    );
    project.files = files;

    const [comments] = await db.execute(
      'SELECT * FROM pms_project_comments WHERE project_id = ? ORDER BY created_at ASC',
      [projectId]
    );
    project.comments = comments;

    const { data } = await axios.get(
      `${process.env.API_URL}?KEY=${process.env.ORACLE_API_KEY}`
    );
    const users = data.data;

    // Map applicant and responsible codes
    if (project.applicant) {
      project.applicantNames = project.applicant
        .split(',')
        .map((c) => c.trim())
        .map((c) => {
          const u = users.find((u) => u.cod_ascinsa === c);
          return u ? `${u.pnombre} ${u.apaterno}` : c;
        })
        .join(', ');
    }
    if (project.responsible) {
      project.responsibleNames = project.responsible
        .split(',')
        .map((c) => c.trim())
        .map((c) => {
          const u = users.find((u) => u.cod_ascinsa === c);
          return u ? `${u.pnombre} ${u.apaterno}` : c;
        })
        .join(', ');
    }

    // Annotate comments with displayName and initial
    project.comments.forEach((c) => {
      const u = users.find((u) => u.cod_ascinsa === c.ascinsa_code);
      if (u) {
        const first = u.pnombre || '';
        const last = u.apaterno || '';
        c.displayName = `${first} ${last}`.trim();
        c.initial = first.charAt(0).toUpperCase() || '?';
      } else {
        c.displayName = c.ascinsa_code;
        c.initial = c.ascinsa_code.charAt(0).toUpperCase() || '?';
      }
    });

    res.render('project/project-detail', {
      categoryTitle: config.title,
      categoryParam: catParam,
      categoryDesc: config.categoryDesc,
      project,
      areaOptions,
      users,
      pageTitle: `Detalles del Proyecto - ${config.title}`,
      isAdmin: req.session.user?.isAdmin,
      isAreaWorker: req.session.user?.isAreaWorker,
      onlyView: req.session.user?.onlyView
    });
  } catch (err) {
    console.error('Error loading project detail:', err);
    res.status(500).send('Error al cargar el detalle del proyecto.');
  }
});

// -------------------
// Show edit project form
// -------------------

/**
 * GET /:category/:id/edit
 * @name ShowProjectEditForm
 * @description
 *   Renders the edit form for a specific project with pre-filled values.
 *
 * @param {Request}  req  - Express request with `req.params.category` and `req.params.id`
 * @param {Response} res  - Express response
 * @async
 */
router.get('/:category/:id/edit', async (req, res) => {
  const catParam = req.params.category.toLowerCase();
  const projectId = req.params.id;
  const config = categoryConfig[catParam];
  if (!config)
    return res.status(404).send('Categoría de proyecto no encontrada.');

  try {
    const [[project]] = await db.execute(
      'SELECT * FROM pms_projects WHERE category = ? AND id = ?',
      [catParam, projectId]
    );
    if (!project) return res.status(404).send('Proyecto no encontrado.');

    // Normalize dates and responsibles
    if (project.start_date) {
      project.start_date = new Date(project.start_date)
        .toISOString()
        .split('T')[0];
    }
    if (project.end_date) {
      project.end_date = new Date(project.end_date).toISOString().split('T')[0];
    }
    try {
      project.responsible = JSON.parse(project.responsible) || [];
    } catch {
      project.responsible = project.responsible
        ? project.responsible.split(',').map((r) => r.trim())
        : [];
    }

    const { data } = await axios.get(
      `${process.env.API_URL}?KEY=${process.env.ORACLE_API_KEY}`
    );
    const allUsers = data.data;
    const users = allUsers.filter((u) => u.area === '004' && u.puesto);
    const solicitantes = allUsers.filter(
      (u) =>
        u.puesto &&
        (u.puesto.toUpperCase().includes('JEFE') ||
          u.puesto.toUpperCase().includes('GERENTE') ||
          u.puesto.toUpperCase() === 'EJECUTIVO DE PROYECTOS')
    );

    res.render('project/project-edit', {
      categoryTitle: config.title,
      categoryParam: catParam,
      categoryDesc: config.categoryDesc,
      columns: [...config.columns, 'Descripción', 'Área'],
      columnKeyMap: config.columnKeyMap,
      project,
      areaOptions,
      users,
      solicitantes,
      isAdmin: req.session.user?.isAdmin,
      pageTitle: `Editar Proyecto #${projectId}`
    });
  } catch (err) {
    console.error('Error loading project for edit:', err);
    res.status(500).send('Error al cargar el proyecto para edición.');
  }
});

// -------------------
// Update a project
// -------------------

/**
 * POST /:category/:id/edit
 * 
 * @name UpdateProject
 * @description
 *   Updates project fields in the database, logs changes, and redirects.
 *
 * @param {Request}  req  - Express request with updated fields
 * @param {Response} res  - Express response
 * @async
 */
router.post('/:category/:id/edit', async (req, res) => {
  const { category, id } = req.params;
  const {
    title,
    detail,
    priority,
    applicant,
    responsible,
    progress_percentage,
    end_date,
    prod,
    observations,
    risk,
    consequence,
    classifier,
    subclassifier,
    location,
    floor,
    status
  } = req.body;

  try {
    const clean = (val) => (val === undefined || val === '' ? null : val);
    const responsibleVal =
      responsible === undefined
        ? null
        : Array.isArray(responsible)
          ? JSON.stringify(responsible)
          : responsible;

    const [[oldProject]] = await db.execute(
      'SELECT * FROM pms_projects WHERE category = ? AND id = ?',
      [category, id]
    );

    const updateFields = {
      title: clean(title),
      detail: clean(detail),
      priority: clean(priority),
      applicant: clean(applicant),
      responsible: responsibleVal,
      start_date: oldProject.start_date,
      due_date: oldProject.due_date,
      end_date: clean(end_date),
      progress_percentage: clean(progress_percentage),
      prod: clean(prod),
      observations: clean(observations),
      risk: clean(risk),
      consequence: clean(consequence),
      classifier: clean(classifier),
      subclassifier: clean(subclassifier),
      location: clean(location),
      floor: floor ? parseInt(floor, 10) : null,
      status: clean(status),
      updated_at: new Date()
    };

    const setClause = Object.keys(updateFields)
      .map((f) => `${f} = ?`)
      .join(', ');
    const vals = [...Object.values(updateFields), category, id];

    await db.execute(
      `UPDATE pms_projects SET ${setClause} WHERE category = ? AND id = ?`,
      vals
    );

    // Compare old vs new and log changes
    const changes = [];
    [
      'title',
      'detail',
      'priority',
      'applicant',
      'progress_percentage',
      'prod'
    ].forEach((field) => {
      if (`${oldProject[field]}` !== `${updateFields[field]}`) {
        changes.push(
          `${field} de "${oldProject[field]}" a "${updateFields[field]}"`
        );
      }
    });
    const oldResp = (() => {
      try {
        return JSON.parse(oldProject.responsible);
      } catch {
        return oldProject.responsible
          ? oldProject.responsible.split(',').map((r) => r.trim())
          : [];
      }
    })();
    const newResp = responsibleVal
      ? Array.isArray(responsible)
        ? responsible
        : [responsible]
      : [];
    if (JSON.stringify(oldResp.sort()) !== JSON.stringify(newResp.sort())) {
      changes.push('responsables modificados');
    }
    if (changes.length) {
      await logActivity(
        req.session.user.fullName,
        `editó proyecto "${title}"`,
        changes.join('; ')
      );
    }

    req.flash('success', 'Proyecto actualizado correctamente');
    res.redirect(`/projects/${category}/${id}`);
  } catch (err) {
    console.error('Error updating project:', err);
    req.flash('error', 'Error al actualizar el proyecto');
    res.redirect(`/projects/${category}/${id}/edit`);
  }
});

// -------------------
// Delete a project
// -------------------

/**
 * POST /:category/:id/delete
 * @name DeleteProject
 * @description
 *   Deletes a project record and logs the deletion.
 *
 * @param {Request}  req  - Express request with `req.params.category` and `req.params.id`
 * @param {Response} res  - Express response
 * @async
 */
router.post('/:category/:id/delete', async (req, res) => {
  const { category, id } = req.params;
  try {
    const [[project]] = await db.execute(
      'SELECT title FROM pms_projects WHERE id = ? AND category = ?',
      [id, category]
    );
    if (!project) {
      req.flash('error', 'Proyecto no encontrado');
      return res.redirect(`/projects/${category}`);
    }

    await db.execute('DELETE FROM pms_projects WHERE id = ? AND category = ?', [
      id,
      category
    ]);

    await logActivity(
      req.session.user.fullName,
      `eliminó proyecto “${project.title}”`,
      `ID del proyecto ${id}`
    );
    req.flash('success', `Proyecto #${id} eliminado correctamente`);
    res.redirect(`/projects/${category}`);
  } catch (err) {
    console.error('Error deleting project:', err);
    req.flash('error', 'Error al eliminar el proyecto');
    res.redirect(`/projects/${category}`);
  }
});

// -------------------
// List tasks for a project
// -------------------

/**
 * GET /:category/:projectId/tasks
 * @name ListTasks
 * @description
 *   Lists tasks for a project and renders them in the detail view.
 *
 * @param {Request}  req  - Express request with `req.params.projectId`
 * @param {Response} res  - Express response
 * @async
 */
router.get('/:category/:projectId/tasks', async (req, res) => {
  const { projectId, category } = req.params;
  try {
    const [tasks] = await db.execute(
      'SELECT * FROM pms_tasks WHERE project_id = ?',
      [projectId]
    );
    const tasksWithUsers = tasks.map((task) => {
      if (task.users) {
        task.user_names = task.users.split(',');
      }
      return task;
    });
    res.render('project/project-detail', {
      categoryTitle: categoryConfig[category].title,
      categoryParam: category,
      projectId,
      tasks: tasksWithUsers,
      pageTitle: `Tasks for Project - ${categoryConfig[category].title}`
    });
  } catch (err) {
    console.error(`Error retrieving tasks for project ID ${projectId}:`, err);
    res.status(500).send('Error loading tasks for the project.');
  }
});

// -------------------
// Show task creation form
// -------------------

/**
 * GET /:category/:projectId/tasks/create
 * @name ShowTaskCreateForm
 * @description
 *   Renders form to create a new task under a project.
 *
 * @param {Request}  req       - Express request with `req.params.projectId`
 * @param {Response} res       - Express response
 * @async
 */
router.get('/:category/:projectId/tasks/create', async (req, res) => {
  const { category, projectId } = req.params;
  const config = categoryConfig[category];
  if (!config) return res.status(404).send('Category not found.');

  try {
    const { data } = await axios.get(
      `${process.env.API_URL}?KEY=${process.env.ORACLE_API_KEY}`
    );
    const allUsers = data.data;
    const responsables = allUsers.filter(
      (u) => String(u.area).trim() === '004' && u.puesto
    );

    res.render('project/task-create', {
      categoryTitle: config.title,
      categoryParam: category,
      projectId,
      categoryDesc: config.categoryDesc,
      responsables,
      isAdmin: req.session.user?.isAdmin,
      pageTitle: `Create Task - ${config.title}`
    });
  } catch (err) {
    console.error('Error loading users:', err);
    res.status(500).send('Error loading users.');
  }
});

// -------------------
// Create a new task
// -------------------

/**
 * POST /:category/:projectId/tasks/create
 * @name CreateTask
 * @description
 *   Inserts a new task record and logs the creation.
 *
 * @param {Request}  req  - Express request with form fields
 * @param {Response} res  - Express response
 * @async
 */
router.post('/:category/:projectId/tasks/create', async (req, res) => {
  const { category, projectId } = req.params;
  const { title, description, priority, due_date, responsible } = req.body;

  const taskData = {
    project_id: projectId,
    title,
    description,
    priority,
    due_date: due_date || null,
    status: 'Pendiente',
    responsible: Array.isArray(responsible)
      ? responsible.join(',')
      : responsible,
    created_at: new Date(),
    updated_at: new Date()
  };

  try {
    const cols = Object.keys(taskData);
    const vals = Object.values(taskData);
    const placeholders = cols.map(() => '?').join(', ');

    await db.execute(
      `INSERT INTO pms_tasks (${cols.join(', ')}) VALUES (${placeholders})`,
      vals
    );

    await logActivity(
      req.session.user.fullName,
      `creó una nueva tarea “${title}”`,
      `ID del proyecto: ${projectId}`
    );

    req.flash('success', 'Tarea creada correctamente');
    res.redirect(`/projects/${category}/${projectId}`);
  } catch (err) {
    console.error('Error creating task:', err);
    req.flash('error', 'Error al crear la tarea');
    res.redirect(`/projects/${category}/${projectId}`);
  }
});

// -------------------
// Show task edit form
// -------------------

/**
 * GET /:category/:projectId/tasks/:taskId/edit
 * @name ShowTaskEditForm
 * @description
 *   Renders form to edit an existing task.
 *
 * @param {Request}  req       - Express request with `req.params.taskId`
 * @param {Response} res       - Express response
 * @async
 */
router.get('/:category/:projectId/tasks/:taskId/edit', async (req, res) => {
  const { projectId, taskId } = req.params;
  try {
    const [tasks] = await db.execute(
      'SELECT * FROM pms_tasks WHERE id = ? AND project_id = ?',
      [taskId, projectId]
    );
    if (!tasks.length) return res.status(404).send('Task not found.');

    const task = tasks[0];
    const { data } = await axios.get(
      `${process.env.API_URL}?KEY=${process.env.ORACLE_API_KEY}`
    );
    const allUsers = data.data;
    const responsables = allUsers.filter((u) => u.area === '004' && u.puesto);
    const selectedUsers = task.responsible ? task.responsible.split(',') : [];

    res.render('project/task-edit', {
      task,
      responsables,
      selectedUsers,
      pageTitle: `Edit Task #${taskId}`,
      isAdmin: req.session.user?.isAdmin
    });
  } catch (err) {
    console.error('Error loading task for editing:', err);
    res.status(500).send('Error loading task.');
  }
});

// -------------------
// Update a task
// -------------------

/**
 * POST /:category/:projectId/tasks/:taskId/edit
 * @name UpdateTask
 * @description
 *   Updates a task and logs changes.
 *
 * @param {Request}  req  - Express request with update fields
 * @param {Response} res  - Express response
 * @async
 */
router.post('/:category/:projectId/tasks/:taskId/edit', async (req, res) => {
  const { category, projectId, taskId } = req.params;
  const { priority, status, responsible, due_date } = req.body;

  const [[old]] = await db.execute(
    `SELECT priority, status, responsible, due_date
       FROM pms_tasks
       WHERE id = ? AND project_id = ?`,
    [taskId, projectId]
  );

  const responsibleStr = Array.isArray(responsible)
    ? responsible.join(',')
    : responsible;

  await db.execute(
    `UPDATE pms_tasks
         SET priority = ?, status = ?, responsible = ?, due_date = ?, updated_at = NOW()
       WHERE id = ? AND project_id = ?`,
    [
      priority,
      status,
      responsibleStr,
      due_date && due_date.length ? due_date : null,
      taskId,
      projectId
    ]
  );

  // Compare and log
  const oldDue = old.due_date
    ? new Date(old.due_date).toISOString().split('T')[0]
    : null;
  const newDue = due_date
    ? new Date(due_date).toISOString().split('T')[0]
    : null;
  const changes = [];
  if (`${old.priority}` !== priority)
    changes.push(`Prioridad de ${old.priority} a ${priority}`);
  if (old.status !== status)
    changes.push(`Estado de "${old.status}" a "${status}"`);
  if (old.responsible !== responsibleStr)
    changes.push('Responsables actualizados');
  if (oldDue !== newDue)
    changes.push(`Fecha de vencimiento de "${oldDue}" a "${newDue}"`);
  if (changes.length) {
    await logActivity(
      req.session.user.fullName,
      `editó tarea ID ${taskId}`,
      changes.join('\n')
    );
  }

  req.flash('success', 'Tarea actualizada correctamente');
  res.redirect(`/projects/${category}/${projectId}`);
});

// -------------------
// Delete a task
// -------------------

/**
 * POST /:category/:projectId/tasks/:taskId/delete
 * @name DeleteTask
 * @description
 *   Deletes a task and logs the deletion.
 *
 * @param {Request}  req  - Express request
 * @param {Response} res  - Express response
 * @async
 */
router.post('/:category/:projectId/tasks/:taskId/delete', async (req, res) => {
  const { category, projectId, taskId } = req.params;
  try {
    const [[task]] = await db.execute(
      'SELECT title FROM pms_tasks WHERE id = ? AND project_id = ?',
      [taskId, projectId]
    );
    if (!task) {
      req.flash('error', 'Tarea no encontrada');
      return res.redirect(`/projects/${category}/${projectId}`);
    }
    await db.execute('DELETE FROM pms_tasks WHERE id = ? AND project_id = ?', [
      taskId,
      projectId
    ]);
    await logActivity(
      req.session.user.fullName,
      `eliminó tarea “${task.title}”`,
      `ID de la tarea: ${taskId}`
    );
    req.flash('success', `Tarea #${taskId} eliminada correctamente`);
    res.redirect(`/projects/${category}/${projectId}`);
  } catch (err) {
    console.error('Error deleting task:', err);
    req.flash('error', 'Error al eliminar la tarea');
    res.redirect(`/projects/${category}/${projectId}`);
  }
});

// -------------------
// Task hours JSON endpoint
// -------------------

/**
 * GET /:category/:projectId/tasks/:taskId/hours/json
 * @name GetTaskHoursJson
 * @description
 *   Returns JSON list of hour logs for a specific task.
 *
 * @param {Request}  req  - Express request
 * @param {Response} res  - Express response
 * @async
 */
router.get(
  '/:category/:projectId/tasks/:taskId/hours/json',
  async (req, res) => {
    const { taskId } = req.params;
    try {
      const [logs] = await db.execute(
        `SELECT
         id,
         DATE_FORMAT(hour_start, '%Y-%m-%dT%TZ') as hour_start,
         DATE_FORMAT(hour_end, '%Y-%m-%dT%TZ') as hour_end,
         hours_taken,
         user_code
       FROM pms_task_hours
       WHERE task_id = ?
       ORDER BY hour_start DESC`,
        [taskId]
      );
      res.json(logs);
    } catch (err) {
      console.error('Error fetching task hours logs:', err);
      res.status(500).json([]);
    }
  }
);

// -------------------
// Add task hour
// -------------------

/**
 * POST /:category/:projectId/tasks/:taskId/hours
 * @name AddTaskHour
 * @middleware logAction('add_task_hour')
 * @description
 *   Inserts a new hour entry for a task and returns success JSON.
 *
 * @param {Request}  req  - Express request with hour_start, hour_end, user_code
 * @param {Response} res  - Express response
 * @async
 */
router.post(
  '/:category/:projectId/tasks/:taskId/hours',
  logAction('add_task_hour'),
  async (req, res) => {
    const { taskId } = req.params;
    const { hour_start, hour_end, user_code } = req.body;
    try {
      const fmt = (iso) =>
        new Date(iso).toISOString().replace('T', ' ').replace('.000Z', '');
      const hoursTaken = parseFloat(
        ((new Date(hour_end) - new Date(hour_start)) / 3600000).toFixed(2)
      );

      await db.execute(
        `INSERT INTO pms_task_hours
         (task_id, user_code, hour_start, hour_end, hours_taken)
       VALUES (?, ?, ?, ?, ?)`,
        [taskId, user_code, fmt(hour_start), fmt(hour_end), hoursTaken]
      );
      res.json({ success: true });
    } catch (err) {
      console.error('Error adding task hour:', err);
      res.status(500).json({ error: 'Error al agregar hora' });
    }
  }
);

// -------------------
// Upload project file
// -------------------

/**
 * POST /:category/:projectId/files/upload
 * @name UploadProjectFile
 * @middleware logAction('upload_file')
 * @description
 *   Handles project file uploads and logs the action.
 *
 * @param {Request}  req  - Express request with `req.file`
 * @param {Response} res  - Express response
 * @async
 */
router.post(
  '/:category/:projectId/files/upload',
  logAction('upload_file'),
  upload.single('projectFile'),
  async (req, res) => {
    const { category, projectId } = req.params;
    try {
      if (!req.file) {
        req.flash('error', 'No se seleccionó ningún archivo');
        return res.redirect(`/projects/${category}/${projectId}`);
      }
      const {
        originalname: fileName,
        filename,
        mimetype: fileType,
        size: fileSize
      } = req.file;
      const filePath = `/uploads/projects/${filename}`;

      await db.execute(
        `INSERT INTO pms_project_attachments
         (project_id, file_name, file_path, file_type, file_size, uploaded_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
        [projectId, fileName, filePath, fileType, fileSize]
      );

      req.flash('success', 'Archivo subido correctamente');
      res.redirect(`/projects/${category}/${projectId}`);
    } catch (err) {
      console.error('Error uploading file:', err);
      req.flash('error', 'Error subiendo el archivo');
      res.redirect('back');
    }
  }
);

// -------------------
// Delete project file
// -------------------

/**
 * POST /:category/:projectId/files/:fileId/delete
 * @name DeleteProjectFile
 * @middleware logAction('delete_file')
 * @description
 *   Deletes an attached file from a project and logs the deletion.
 *
 * @param {Request}  req  - Express request with `req.params.fileId`
 * @param {Response} res  - Express response
 * @async
 */
router.post(
  '/:category/:projectId/files/:fileId/delete',
  logAction('delete_file'),
  async (req, res) => {
    const { category, projectId, fileId } = req.params;
    try {
      const [rows] = await db.execute(
        'SELECT file_path FROM pms_project_attachments WHERE id = ? AND project_id = ?',
        [fileId, projectId]
      );
      if (!rows.length) {
        req.flash('error', 'Archivo no encontrado');
        return res.redirect(`/projects/${category}/${projectId}`);
      }
      await db.execute(
        'DELETE FROM pms_project_attachments WHERE id = ? AND project_id = ?',
        [fileId, projectId]
      );
      req.flash('success', 'Archivo eliminado correctamente');
      res.redirect(`/projects/${category}/${projectId}`);
    } catch (err) {
      console.error('Error deleting file:', err);
      req.flash('error', 'Error eliminando el archivo');
      res.redirect('back');
    }
  }
);

// -------------------
// Add project comment
// -------------------

/**
 * POST /:category/:id/comments
 * @name AddProjectComment
 * @middleware logAction('add_comment')
 * @description
 *   Inserts a new comment for a project and redirects back.
 *
 * @param {Request}  req  - Express request with `req.body.comment`
 * @param {Response} res  - Express response
 * @async
 */
router.post(
  '/:category/:id/comments',
  logAction('add_comment'),
  async (req, res) => {
    const cat = req.params.category.toLowerCase();
    const projectId = req.params.id;
    const ascensa = req.session.user?.cod_ascinsa;
    const commentText = req.body.comment;
    if (!ascensa || !commentText) {
      req.flash('error', 'No se pudo enviar el comentario.');
      return res.redirect(`/projects/${cat}/${projectId}`);
    }
    try {
      await db.execute(
        'INSERT INTO pms_project_comments (project_id, ascinsa_code, comment, created_at) VALUES (?, ?, ?, NOW())',
        [projectId, ascensa, commentText]
      );
      req.flash('success', 'Comentario agregado correctamente.');
      res.redirect(`/projects/${cat}/${projectId}`);
    } catch (err) {
      console.error('Error saving comment:', err);
      req.flash('error', 'Error al guardar el comentario.');
      res.redirect(`/projects/${cat}/${projectId}`);
    }
  }
);

// -------------------
// Export the router
// -------------------

/**
 * Exports this router module so it can be mounted in `app.js`:
 *
 *   const projectsRouter = require('./routes/projects');
 *   app.use('/projects', projectsRouter);
 */
module.exports = router;

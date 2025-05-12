// -------------------
// Imports and router setup
// -------------------

/**
 * @file Defines routes for hour logging and management:
 *   - GET /view-hours       → list all logged hours
 *   - GET /view/:id         → view details of a specific record
 *   - GET /log-hours        → show form to create a new record
 *   - POST /log-hours       → submit a new record (with optional image upload)
 *   - GET /edit/:id         → show form to edit an existing record
 *   - POST /edit/:id        → submit updates to an existing record
 *   - POST /delete/:id      → delete a user-owned record
 */

const express = require('express'); // Express framework
const router = express.Router(); // Create a modular router
const db = require('../config/db'); // MySQL database connection
const moment = require('moment'); // Date formatting
const authenticateJWT = require('../middleware/authenticateJWT'); // JWT auth middleware
const multer = require('multer'); // File upload middleware
const path = require('path'); // File path utilities
const axios = require('axios'); // HTTP client for external API
const { logActivity } = require('../utils/loggerUtility'); // Activity logger utility

// Configure multer storage and filtering for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads/hours'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// -------------------
// Routes
// -------------------

/**
 * GET /view-hours
 * @name ViewHours
 * @middleware authenticateJWT
 * @description
 *   Retrieves all hour records ordered by start date descending
 *   and renders the 'view-hours' template.
 *
 * @param {Request}  req  - Express request, with `req.user`
 * @param {Response} res  - Express response
 * @async
 */
router.get('/view-hours', authenticateJWT, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        id, user_code, full_name, title,
        date_begin, date_closure, hours_worked,
        requested_by, extralaboral, reason, image_path
      FROM pms_hour_control
      ORDER BY date_begin DESC
    `);

    res.render('hour/view-hours', {
      hours: rows,
      title: 'Ver Horas Registradas',
      moment,
      user: req.user
    });
  } catch (error) {
    console.error('Error loading hours:', error);
    res.status(500).send('Error loading hours');
  }
});

/**
 * GET /view/:id
 * @name ViewHourDetail
 * @middleware authenticateJWT
 * @description
 *   Fetches a single hour record by ID and renders the 'view-detail' template.
 *
 * @param {Request}  req  - Express request, with `req.params.id`
 * @param {Response} res  - Express response
 * @async
 */
router.get('/view/:id', authenticateJWT, async (req, res) => {
  const [
    [hour]
  ] = await db.execute('SELECT * FROM pms_hour_control WHERE id = ?', [
    req.params.id
  ]);

  res.render('hour/view-detail', { hour, moment });
});

/**
 * GET /log-hours
 * @name ShowLogForm
 * @middleware authenticateJWT
 * @description
 *   Retrieves a list of bosses from external API and renders the
 *   'log-hours' form with default values.
 *
 * @param {Request}  req  - Express request, with `req.user`
 * @param {Response} res  - Express response
 * @async
 */
router.get('/log-hours', authenticateJWT, async (req, res) => {
  const response = await axios.get(
    `${process.env.API_URL}?KEY=${process.env.ORACLE_API_KEY}`
  );
  const bosses = response.data.data.filter(
    u =>
      (u.puesto && u.puesto.toUpperCase().includes('JEFE DE ')) ||
      u.puesto.toUpperCase().includes('GERENTE ')
  );

  res.render('hour/log-hours', {
    title: 'Registrar Horas',
    user: req.user,
    bosses,
    values: {
      title: '',
      task_description: '',
      start_date: moment().format('YYYY-MM-DDTHH:mm'),
      end_date: moment().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
      requested_by: '',
      extralaboral: 'No',
      reason: ''
    }
  });
});

/**
 * POST /log-hours
 * @name LogHours
 * @middleware authenticateJWT
 * @description
 *   Processes the submission of a new hour record, calculates hours worked,
 *   handles optional image upload, inserts into database, logs activity,
 *   and redirects to the list view.
 *
 * @param {Request}  req
 *   @property {string} req.body.title
 *   @property {string} req.body.task_description
 *   @property {string} req.body.start_date
 *   @property {string} req.body.end_date
 *   @property {string} req.body.requested_by
 *   @property {string} req.body.extralaboral
 *   @property {string} req.body.reason
 * @param {Response} res
 * @async
 */
router.post(
  '/log-hours',
  authenticateJWT,
  upload.single('hour_image'),
  async (req, res) => {
    const {
      title,
      task_description,
      start_date,
      end_date,
      requested_by,
      extralaboral,
      reason
    } = req.body;

    try {
      const date_begin = moment(start_date).format('YYYY-MM-DD HH:mm:ss');
      const date_closure = moment(end_date).format('YYYY-MM-DD HH:mm:ss');
      const hoursWorked = moment(end_date)
        .diff(moment(start_date), 'hours', true)
        .toFixed(2);

      let imagePath = null;
      if (req.file) {
        imagePath = `/uploads/hours/${req.file.filename}`;
      }

      await db.execute(
        `INSERT INTO pms_hour_control (
           user_code, full_name, title, task_description,
           date_begin, date_closure, hours_worked,
           requested_by, image_path, extralaboral,
           reason, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          req.user.cod_ascinsa,
          req.user.fullName,
          title,
          task_description,
          date_begin,
          date_closure,
          hoursWorked,
          requested_by,
          imagePath,
          extralaboral,
          reason
        ]
      );

      await logActivity(
        req.user.fullName,
        `creó un nuevo registro de horas: "${title}"`,
        `Se trabajaron ${parseFloat(hoursWorked).toFixed(2)} horas.`
      );

      req.flash(
        'success',
        `Horas registradas exitosamente: ${hoursWorked} horas`
      );
      res.redirect('/hour/view-hours');
    } catch (err) {
      console.error('Database error:', err);
      req.flash('error', 'Error al registrar horas');
      res.redirect('/hour/log-hours');
    }
  }
);

/**
 * GET /edit/:id
 * @name ShowEditForm
 * @middleware authenticateJWT
 * @description
 *   Fetches an existing hour record owned by the user, retrieves bosses list,
 *   and renders the 'edit-hours' form with pre-filled values.
 *
 * @param {Request}  req  - Express request, with `req.params.id` and `req.user`
 * @param {Response} res  - Express response
 * @async
 */
router.get('/edit/:id', authenticateJWT, async (req, res) => {
  const [
    [hour]
  ] = await db.execute(
    'SELECT * FROM pms_hour_control WHERE id = ? AND user_code = ?',
    [req.params.id, req.user.cod_ascinsa]
  );

  if (!hour) {
    req.flash('error', 'No tienes permiso para editar este registro');
    return res.redirect('/hour/view-hours');
  }

  const response = await axios.get(
    `${process.env.API_URL}?KEY=${process.env.ORACLE_API_KEY}`
  );
  const bosses = response.data.data.filter(
    u => u.puesto && u.puesto.toUpperCase().includes('JEFE DE ')
  );

  res.render('hour/edit-hours', {
    hour,
    moment,
    bosses,
    values: {
      start_date: moment(hour.date_begin).format('YYYY-MM-DDTHH:mm'),
      end_date: moment(hour.date_closure).format('YYYY-MM-DDTHH:mm'),
      requested_by: hour.requested_by,
      extralaboral: hour.extralaboral,
      reason: hour.reason
    }
  });
});

/**
 * POST /edit/:id
 * @name UpdateHourRecord
 * @middleware authenticateJWT
 * @description
 *   Updates an existing hour record owned by the user, logs field changes,
 *   and redirects back to the list view.
 *
 * @param {Request}  req
 *   @property {string} req.body.title
 *   @property {string} req.body.task_description
 *   @property {string} req.body.start_date
 *   @property {string} req.body.end_date
 *   @property {string} req.body.requested_by
 *   @property {string} req.body.extralaboral
 *   @property {string} req.body.reason
 * @param {Response} res
 * @async
 */
router.post('/edit/:id', authenticateJWT, async (req, res) => {
  const {
    title,
    task_description,
    start_date,
    end_date,
    requested_by,
    extralaboral,
    reason
  } = req.body;

  const [
    [old]
  ] = await db.execute(
    'SELECT * FROM pms_hour_control WHERE id = ? AND user_code = ?',
    [req.params.id, req.user.cod_ascinsa]
  );

  if (!old) {
    req.flash('error', 'No tienes permiso para editar este registro');
    return res.redirect('/hour/view-hours');
  }

  const changes = [];
  if (old.title !== title) changes.push(`Título: "${old.title}" → "${title}"`);
  if (old.task_description !== task_description)
    changes.push('Descripción actualizada.');
  if (moment(old.date_begin).format('YYYY-MM-DDTHH:mm') !== start_date)
    changes.push(
      `Inicio: "${moment(old.date_begin).format(
        'YYYY-MM-DDTHH:mm'
      )}" → "${start_date}"`
    );
  if (moment(old.date_closure).format('YYYY-MM-DDTHH:mm') !== end_date)
    changes.push(
      `Fin: "${moment(old.date_closure).format(
        'YYYY-MM-DDTHH:mm'
      )}" → "${end_date}"`
    );
  if (old.requested_by !== requested_by)
    changes.push(`Solicitado Por: "${old.requested_by}" → "${requested_by}"`);
  if (old.extralaboral !== extralaboral)
    changes.push(`Extralaboral: "${old.extralaboral}" → "${extralaboral}"`);
  if (old.reason !== reason)
    changes.push(`Razón: "${old.reason}" → "${reason}"`);

  try {
    await db.execute(
      `UPDATE pms_hour_control
         SET title=?, task_description=?, date_begin=?, date_closure=?,
             requested_by=?, extralaboral=?, reason=?, updated_at=NOW()
       WHERE id=? AND user_code=?`,
      [
        title,
        task_description,
        moment(start_date).format('YYYY-MM-DD HH:mm:ss'),
        moment(end_date).format('YYYY-MM-DD HH:mm:ss'),
        requested_by,
        extralaboral,
        reason,
        req.params.id,
        req.user.cod_ascinsa
      ]
    );

    if (changes.length) {
      await logActivity(
        req.user.fullName,
        `editó registro de horas ID ${req.params.id}`,
        changes.join('\n')
      );
    }

    req.flash('success', 'Registro actualizado correctamente');
    res.redirect('/hour/view-hours');
  } catch (err) {
    console.error('Error updating hour record:', err);
    req.flash('error', 'Error al actualizar el registro');
    res.redirect(`/hour/edit/${req.params.id}`);
  }
});

/**
 * POST /delete/:id
 * @name DeleteHourRecord
 * @middleware authenticateJWT
 * @description
 *   Deletes a user-owned hour record by ID, logs the deletion,
 *   and redirects to the list view.
 *
 * @param {Request}  req  - Express request, with `req.params.id` and `req.user`
 * @param {Response} res  - Express response
 * @async
 */
router.post('/delete/:id', authenticateJWT, async (req, res) => {
  try {
    const [
      [hour]
    ] = await db.execute(
      'SELECT title FROM pms_hour_control WHERE id = ? AND user_code = ?',
      [req.params.id, req.user.cod_ascinsa]
    );

    if (!hour) {
      req.flash('error', 'Registro no encontrado');
      return res.redirect('/hour/view-hours');
    }

    await db.execute(
      'DELETE FROM pms_hour_control WHERE id = ? AND user_code = ?',
      [req.params.id, req.user.cod_ascinsa]
    );

    await logActivity(
      req.user.fullName,
      `eliminó registro de horas: "${hour.title}"`,
      `ID: ${req.params.id}`
    );

    req.flash('success', 'Registro eliminado');
    res.redirect('/hour/view-hours');
  } catch (err) {
    console.error('Error deleting hour record:', err);
    req.flash('error', 'Error al eliminar el registro');
    res.redirect('/hour/view-hours');
  }
});

// -------------------
// Export the router
// -------------------

/**
 * Exports this router module so it can be mounted in `app.js`:
 *
 *   const hourRouter = require('./routes/hour');
 *   app.use('/hour', hourRouter);
 */
module.exports = router;

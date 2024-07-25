
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {v4: uuidv4} = require("uuid");
admin.initializeApp();

exports.pacientes = functions.https.onRequest(async (req, res) => {
  if (req.method === "POST") {
    return createPaciente(req, res);
  } else if (req.method === "GET") {
    if (req.path === "/") {
      return getPacientes(req, res);
    } else {
      const uuid = req.path.split("/").pop();
      return getPaciente(req, res, uuid);
    }
  } else {
    return res.status(405).send(
        {message: "Método no permitido"},
    );
  }
});

/**
 * Creates a new patient in the Realtime Database
 *
 * @param {Object} req - Request
 * @param {Object} res - Response
 */
async function createPaciente(req, res) {
  const {
    nombre,
    apellidoPaterno,
    apellidoMaterno,
    numeroSeguridadSocial,
    accesible,
  } = req.body;

  if (!nombre ||
      !apellidoPaterno ||
      !apellidoMaterno ||
      !numeroSeguridadSocial ||
      accesible === undefined) {
    return res.status(400).send(
        {
          message: "Faltan campos para crear al paciente",
        },
    );
  }

  const uuid = uuidv4();
  const nuevoPaciente = {
    nombre,
    apellidoPaterno,
    apellidoMaterno,
    numeroSeguridadSocial,
    accesible,
  };

  try {
    await admin.database().ref(`/pacientes/${uuid}`).set(nuevoPaciente);
    await admin.database().ref(`/logs`).push({
      createdAt: new Date().toISOString(),
      message: `Acceso a endpoint POST /pacientes`,
    });
    res.status(200).send(
        {
          message: "Paciente agregado correctamente",
        },
    );
  } catch (error) {
    res.status(500).send(
        {
          message: "Error al agregar paciente",
          error: error.message,
        },
    );
  }
}

/**
 * Retreives all patients in the Realtime Database
 *
 * @param {Object} req - Request
 * @param {Object} res - Response
 */
async function getPacientes(req, res) {
  try {
    const snapshot = await admin.database().ref("/pacientes").once("value");
    const pacientes = snapshot.val();

    await admin.database().ref(`/logs`).push({
      createdAt: new Date().toISOString(),
      message: `Acceso a endpoint GET /pacientes`,
    });

    res.status(200).send({pacientes});
  } catch (error) {
    res.status(500).send(
        {
          message: "Error al obtener pacientes",
          error: error.message,
        },
    );
  }
}

/**
 * Retreives a specific patient in the Realtime Database
 *
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @param {Object} uuid - Patient's UUID
 */
async function getPaciente(req, res, uuid) {
  if (!uuid) {
    return res.status(400).send(
        {
          message: "Por favor, entregue un UUID del paciente",
        },
    );
  }

  try {
    const snapshot = await admin.database().ref(`/pacientes/${uuid}`)
        .once("value");
    const paciente = snapshot.val();

    if (paciente) {
      if (!paciente.accesible) {
        return res.status(403).send(
            {
              message: "Este paciente no es accesible",
            },
        );
      }

      await admin.database().ref(`/logs`).push({
        createdAt: new Date().toISOString(),
        message: `Acceso a endpoint GET /pacientes/${uuid}`,
      });

      res.status(200).send({paciente});
    } else {
      res.status(404).send({message: "Paciente no encontrado"});
    }
  } catch (error) {
    res.status(500).send(
        {
          message: "Error al obtener paciente",
          error: error.message,
        },
    );
  }
}

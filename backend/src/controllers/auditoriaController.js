const historicoRepository = require('../repositories/historicoRepository');
const serializar = require('../utils/serializadores');
const { tratarErro } = require('../utils/erros');

class AuditoriaController {
  // Lista a auditoria (só Administrador). Filtros: ?setor=  ?usuario= (nome exato)  ?de=  ?ate=
  async listar(req, res) {
    try {
      const { setor, usuario, de, ate } = req.query;
      const registros = await historicoRepository.listar({ setor, usuario, de, ate });
      return res.json(registros.map(serializar.auditoria));
    } catch (error) {
      return tratarErro(res, error, 'buscar a auditoria');
    }
  }
}

module.exports = new AuditoriaController();

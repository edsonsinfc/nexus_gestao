const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    // Pegar o token do header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    const parts = authHeader.split(' ');

    if (!parts.length === 2) {
        return res.status(401).json({ error: 'Token error' });
    }

    const [ scheme, token ] = parts;

    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ error: 'Token mal formatado' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Token inválido' });
        }

        req.userId = decoded.id;
        req.userNivel = decoded.nivel_acesso;
        return next();
    });
}

module.exports = authMiddleware;
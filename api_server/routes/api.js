var express = require('express');
var router = express.Router();
var {qw} = require('./util')


var ag = require('agensgraph');
var config = {
    user: 'agens',
    password: 'qwer4321',
    database: 'agens',
    host: 'db',
    port: 5432
};

router.post('/:database/:graphpath', function(req, res, next){
    let {statements} = req.body
    let {database, graphpath} = req.params

    var pool = new ag.Pool(Object.assign({},config,{database}))

    pool.on('connect',(client)=>{
        client.query(`SET graph_path = ${graphpath} `).catch(err=>{
            res.json(error);
        })
    });

    Promise.all(statements.map(stmt=>{
        console.log(  qw(stmt.query, stmt.params || []))

        return pool.query(qw(stmt.query, stmt.params || [])).then(rslt=>{
            // console.log(JSON.stringify(rslt))
            return {result: rslt}
        }).catch(err=>{
            return {error: { code:err.code , message:err.message , position: err.position }}
        })
    })).then((rslt,error)=>{
        res.json(rslt);
    }).catch(error=>{
        console.error(error)
        res.json(error);
    })
});




module.exports = router;

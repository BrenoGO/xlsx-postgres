require('dotenv').config();
const { Client } = require('pg');
const XLSX = require('xlsx');

let clientPG;
async function connectToDb() {
  clientPG = new Client();
  await clientPG.connect();
}

const getRowsToUpdate = async () => {
  const { rows } = await clientPG.query(`
    select id_material, descricao from "Material" m
    where "deletedAt" is null and id_tipo_material = 1 and descricao != UPPER(descricao)
    order by id_material ;
  `);
  return rows;
}

const updateMateriaisToUpperCase = async () => {
  try {
    const rows = await getRowsToUpdate();
    console.log('rows:', rows.length);
    for(let i = 0; i < rows.length; i++) {
      await clientPG.query(`
        INSERT INTO "Alteracao" (id_usuario, tabela, id_tabela, coluna, valor_antigo)
        values (1, 'Material', ${rows[i].id_material}, 'descricao', '${rows[i].descricao}');
      `);
      await clientPG.query(`
        UPDATE "Material" set descricao='${rows[i].descricao.toUpperCase()}' WHERE id_material = ${rows[i].id_material}
      `);
    }
  } catch (e) {
    console.log('\n\n\n error trying to update Materiais:');
    console.log(e);
    throw e;
  }
}

const main = async () => {
  try {
    await connectToDb();
    await updateMateriaisToUpperCase();
  } catch (e) {
    console.log('\n\n\n error!!!!');
    console.log(e);
  } finally {
    process.exit();
  }
}

main();


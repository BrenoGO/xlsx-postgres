require('dotenv').config();
const { Client } = require('pg');
const XLSX = require('xlsx');

let clientPG;
async function connectToDb() {
  clientPG = new Client();
  await clientPG.connect();
}

const getRowsToDelete = async () => {
  const { rows } = await clientPG.query(`
    select m.id_material from "Material" m
    left join "Ciclo" c on c.id_material = m.id_material 
    where c.id_ciclo is null and m."createdAt" < '2021-07-01 00:00:00' and m."deletedAt" is null
    order by m.id_material
  `);
  return rows;
}

const deleteMateriais = async () => {
  try {
    const rowsToDelete = await getRowsToDelete();
    console.log('rows to Delete:', rowsToDelete.length);
    let deleted = 0;
    for(let i = 0; i < rowsToDelete.length; i++) {
      deleted++;
      await clientPG.query(`
        INSERT INTO "Alteracao" (id_usuario, tabela, id_tabela, coluna, valor_antigo)
        values (1, 'Material', ${rowsToDelete[i].id_material}, 'deletedAt', 'null');
      `);
      await clientPG.query(`
        UPDATE "Material" set "deletedAt" = NOW() WHERE id_material = ${rowsToDelete[i].id_material}
      `);
    }
  } catch (e) {
    console.log('\n\n\n error trying to delete Materiais:');
    console.log(e);
    throw e;
  }
}

const getRowsToUpdate = async () => {
  const { rows } = await clientPG.query(`
    SELECT m.id_material, m.descricao, m."createdAt", tm.nome as "tipoMaterial" FROM "Material" m
    join "TipoMaterial" tm on tm.id_tipo_material = m.id_tipo_material
    where m."deletedAt" is null
  `);
  return rows;
}

const updateMateriais = async () => {
  try {
    const workbook = XLSX.readFile('INVENTARIO.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = await getRowsToUpdate();
    let updated = 0;
    for (let i = 2; i < 100000; i++) {
      if (!sheet[`C${i}`]) {
        console.log(`\n\n Iteration i:${i}, Last ID: ${sheet[`C${i - 1}`].v}`);
        console.log('\n Total updated:', updated);
        break;
      }
      const idTable = sheet[`C${i}`].v;
      const descricaoTable = sheet[`D${i}`].v;
      const row = rows.find((r) => r.id_material === idTable);
      if (!row) {
        continue;
      }
      if (row.descricao !== descricaoTable) {
        updated++;
        await clientPG.query(`
          INSERT INTO "Alteracao" (id_usuario, tabela, id_tabela, coluna, valor_antigo)
          values (1, 'Material', ${idTable}, 'descricao', '${row.descricao}');
        `);
        await clientPG.query(`
          UPDATE "Material" set descricao = '${descricaoTable}' WHERE id_material = ${row.id_material}
        `);
      }
    }
  } catch (e) {
    console.log('\n\n\n error updating materiais:');
    console.log(e);
  }
}

const main = async () => {
  try {
    await connectToDb();
    await deleteMateriais();
    await updateMateriais();
  } catch (e) {
    console.log('\n\n\n error!!!!');
    console.log(e);
  } finally {
    process.exit();
  }
}

main();


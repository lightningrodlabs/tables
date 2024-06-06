import { ColumnType, type Cell, Board, ColumnDef } from './board'; // replace with the actual path to your 'board' module
import { decodeHashFromBase64 } from "@holochain/client";
import type { EntryHash } from "@holochain/client";
import { stringToColor } from './util'; // replace with the actual path to your 'util' module
import type { TablesStore } from './store'; // replace with the actual path to your 'store' module

export async function getValueOfCell(tableHash: EntryHash, rowId: string, columnId: string, store: TablesStore) {
  return new Promise((resolve, reject) => {
    store.boardList.boardData2.get(tableHash).subscribe((boardData) => {
      console.log("board data", boardData)
      if (!boardData) {
        throw new Error(`Table with id ${tableHash} not found`);
      }

      if (!boardData.value || !boardData.value.latestState) {
        throw new Error(`No latest state found for table ${tableHash}`);
      }

      const row = boardData.value.latestState.rows.find(r => r.id === rowId);
      if (!row) {
        throw new Error(`Row with id ${rowId} not found in table ${tableHash}`);
      }

      const cell = row.cells[columnId];
      if (!cell) {
        throw new Error(`Cell with column id ${columnId} not found in row ${rowId} of table ${tableHash}`);
      }

      const def = boardData.value.latestState.columnDefs.find(def => def.id === columnId);
      if (!def) {
        throw new Error(`Column definition for column id ${columnId} not found in table ${tableHash}`);
      }

      switch (def.type) {
        case ColumnType.WeaveAsset:
        case ColumnType.WALEmbed:
          return cell.value; // return the value directly

        case ColumnType.TableLink:
          const linkedBoardHash = def.linkedTable ? decodeHashFromBase64(def.linkedTable) : null;
          const linkedBoardData = def.linkedTable ? store.boardList.boardData2.get(linkedBoardHash) : null;
          const linkedRow = linkedBoardData?.value?.latestState?.rows?.find(r => r.id == cell.value);
          return linkedRow?.cells[def.displayColumn]?.value;

        case ColumnType.User:
          return decodeHashFromBase64(cell.value);

        case ColumnType.Label:
          return stringToColor(cell.value);

        default:
          return resolve(cell.value);
      }
    }, reject);
  });
}
import { ColumnType, SumType, type Cell, Board, ColumnDef } from './board'; // replace with the actual path to your 'board' module
import { decodeHashFromBase64 } from "@holochain/client";
import type { EntryHash } from "@holochain/client";
import { stringToColor } from './util'; // replace with the actual path to your 'util' module
import type { TablesStore } from './store'; // replace with the actual path to your 'store' module

export async function getValueOfCell(tableHash: EntryHash, rowId: string, columnId: string, store: TablesStore) {
  return new Promise((resolve, reject) => {
    let unsubscribe: (() => void) | undefined;
    unsubscribe = store.boardList.boardData2.get(tableHash).subscribe((boardData) => {
      console.log("board data", boardData)
      if (!boardData) {
        return; // Still loading
      }

      if (boardData.status === "error") {
        if (unsubscribe) unsubscribe();
        reject(new Error(`Error loading table: ${boardData.error}`));
        return;
      }

      if (boardData.status !== "complete") {
        return; // Still pending
      }

      if (!boardData.value || !boardData.value.latestState) {
        if (unsubscribe) unsubscribe();
        reject(new Error(`No latest state found for table ${tableHash}`));
        return;
      }

      const row = boardData.value.latestState.rows.find(r => r.id === rowId);
      if (!row) {
        if (unsubscribe) unsubscribe();
        reject(new Error(`Row with id ${rowId} not found in table ${tableHash}`));
        return;
      }

      const cell = row.cells[columnId];
      if (!cell) {
        if (unsubscribe) unsubscribe();
        reject(new Error(`Cell with column id ${columnId} not found in row ${rowId} of table ${tableHash}`));
        return;
      }

      const def = boardData.value.latestState.columnDefs.find(def => def.id === columnId);
      if (!def) {
        if (unsubscribe) unsubscribe();
        reject(new Error(`Column definition for column id ${columnId} not found in table ${tableHash}`));
        return;
      }

      let result;
      switch (def.type) {
        case ColumnType.WeaveAsset:
        case ColumnType.WALEmbed:
          result = cell.value; // return the value directly
          break;

        case ColumnType.TableLink:
          const linkedBoardHash = def.linkedTable ? decodeHashFromBase64(def.linkedTable) : null;
          // Note: linkedBoardData would need similar async handling, but for now we'll skip it
          result = cell.value;
          break;

        case ColumnType.User:
          result = decodeHashFromBase64(cell.value as string);
          break;

        case ColumnType.Label:
          result = stringToColor(cell.value as string);
          break;

        default:
          result = cell.value;
          break;
      }
      
      if (unsubscribe) unsubscribe();
      resolve(result);
    }, reject);
  });
}

export async function getValueOfColumnSummary(tableHash: EntryHash, columnId: string, sumType: SumType, store: TablesStore, query: string) {
  return new Promise((resolve, reject) => {
    let unsubscribe: (() => void) | undefined;
    unsubscribe = store.boardList.boardData2.get(tableHash).subscribe((boardData) => {
      if (!boardData) {
        return; // Still loading
      }

      if (boardData.status === "error") {
        if (unsubscribe) unsubscribe();
        reject(new Error(`Error loading table: ${boardData.error}`));
        return;
      }

      if (boardData.status !== "complete") {
        return; // Still pending
      }

      if (!boardData.value || !boardData.value.latestState) {
        if (unsubscribe) unsubscribe();
        reject(new Error(`No latest state found for table ${tableHash}`));
        return;
      }

      const def = boardData.value.latestState.columnDefs.find(def => def.id === columnId);
      if (!def) {
        if (unsubscribe) unsubscribe();
        reject(new Error(`Column definition for column id ${columnId} not found in table ${tableHash}`));
        return;
      }

      let querriedData = boardData.value.latestState.rows.filter(row => {
        let subbedQuery = query
        Object.keys(row.cells).forEach((cellId) => {
          let value: any = '"' + row.cells[cellId]?.value + '"'
          if (boardData.value.latestState.columnDefs.find((col) => col.id === cellId)?.type === 1) {
            const tempValue = parseInt(String(row.cells[cellId]?.value))
            if (!isNaN(tempValue)) {
              value = tempValue
            }
          }
          subbedQuery = subbedQuery.replace(new RegExp(cellId, 'g'), value);
          subbedQuery = subbedQuery.replace(new RegExp('contains', 'g'), 'includes');
        })
        try {
          return eval(subbedQuery) ? true : false
        } catch {
          return false
        }
      })

      switch (Number(sumType)) {
        case SumType.Sum:
          let sum = Object.values(querriedData).reduce((acc, row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return acc + Number(String(cell.value).replace(/[^0-9-.]/g, ''));
            }
            return acc;
          }, 0)
          if (unsubscribe) unsubscribe();
          resolve(sum);
          break
        case SumType.Count:
          if (unsubscribe) unsubscribe();
          resolve(querriedData.length);
          break;
        case SumType.Average:
          console.log("average")
          let sum2 = Object.values(querriedData).reduce((acc, row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return acc + Number(String(cell.value).replace(/[^0-9-.]/g, ''));
            }
            return acc;
          }, 0)
          console.log("sum2", sum2)
          if (unsubscribe) unsubscribe();
          resolve(sum2 / querriedData.length);
          break;
        
        case SumType.Max:
          let max = Object.values(querriedData).reduce((acc, row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return Math.max(acc, Number(String(cell.value).replace(/[^0-9-.]/g, '')));
            }
            return acc;
          }, Number.MIN_SAFE_INTEGER)
          if (unsubscribe) unsubscribe();
          resolve(max);
          break;
        
        case SumType.Min:
          let min = Object.values(querriedData).reduce((acc, row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return Math.min(acc, Number(String(cell.value).replace(/[^0-9-.]/g, '')));
            }
            return acc;
          }, Number.MAX_SAFE_INTEGER)
          if (unsubscribe) unsubscribe();
          resolve(min);
          break;

        case SumType.Median:
          let values = Object.values(querriedData).map((row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return Number(String(cell.value).replace(/[^0-9-.]/g, ''));
            }
            return 0;
          })
          values.sort((a, b) => a - b);
          let median = 0;
          if (values.length % 2 === 0) {
            median = (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
          } else {
            median = values[(values.length - 1) / 2];
          }
          if (unsubscribe) unsubscribe();
          resolve(median);
          break;
        
        case SumType.Mode:
          let modeMap = {};
          let maxCount = 0;
          let modes = [];
          Object.values(querriedData).forEach((row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              let val = Number(String(cell.value).replace(/[^0-9-.]/g, ''));
              modeMap[val] = (modeMap[val] || 0) + 1;
              if (modeMap[val] > maxCount) {
                modes = [val];
                maxCount = modeMap[val];
              } else if (modeMap[val] === maxCount) {
                modes.push(val);
              }
            }
          })
          if (unsubscribe) unsubscribe();
          resolve(modes);
          break;
        
        case SumType.Range:
          let values2 = Object.values(querriedData).map((row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return Number(String(cell.value).replace(/[^0-9-.]/g, ''));
            }
            return 0;
          })
          values2.sort((a, b) => a - b);
          let range = values2[values2.length - 1] - values2[0];
          if (unsubscribe) unsubscribe();
          resolve(range);
          break;
        
        case SumType.StDeviation:
          let values3 = Object.values(querriedData).map((row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return Number(String(cell.value).replace(/[^0-9-.]/g, ''));
            }
            return 0;
          })
          let mean = values3.reduce((acc, val) => acc + val, 0) / values3.length;
          let stDeviation = Math.sqrt(values3.reduce((acc, val) => acc + (val - mean) ** 2, 0) / values3.length);
          if (unsubscribe) unsubscribe();
          resolve(stDeviation);
          break;

        case SumType.Filled:
          let filled = Object.values(querriedData).reduce((acc, row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return acc + 1;
            }
            return acc;
          }, 0)
          if (unsubscribe) unsubscribe();
          resolve(filled);
          break;

        case SumType.Empty:
          let empty = Object.values(querriedData).reduce((acc, row) => {
            const cell = row.cells[def.id];
            if (!cell || !cell.value) {
              return acc + 1;
            }
            return acc;
          }, 0)
          if (unsubscribe) unsubscribe();
          resolve(empty);
          break;
        
        case SumType.Unique:
          let unique = new Set(Object.values(querriedData).map((row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return cell.value;
            }
            return "";
          })).size;
          if (unsubscribe) unsubscribe();
          resolve(unique);
          break;

        default:
          if (unsubscribe) unsubscribe();
          resolve("--");
          break
          
      }
    }, reject);
  });
}

export async function getColumnValues(tableHash: EntryHash, columnId: string, store: TablesStore) {
  return new Promise((resolve, reject) => {
    let unsubscribe: (() => void) | undefined;
    unsubscribe = store.boardList.boardData2.get(tableHash).subscribe((boardData) => {
      if (!boardData) {
        return; // Still loading
      }

      if (boardData.status === "error") {
        if (unsubscribe) unsubscribe();
        reject(new Error(`Error loading table: ${boardData.error}`));
        return;
      }

      if (boardData.status !== "complete") {
        return; // Still pending
      }

      if (!boardData.value || !boardData.value.latestState) {
        if (unsubscribe) unsubscribe();
        reject(new Error(`No latest state found for table ${tableHash}`));
        return;
      }

      const def = boardData.value.latestState.columnDefs.find(def => def.id === columnId);
      if (!def) {
        if (unsubscribe) unsubscribe();
        reject(new Error(`Column definition for column id ${columnId} not found in table ${tableHash}`));
        return;
      }

      const values = Object.values(boardData.value.latestState.rows).map(row => {
        const cell = row.cells[columnId];
        if (cell && cell.value) {
          return cell.value;
        }
        return "";
      });

      if (unsubscribe) unsubscribe();
      resolve(values);
    }, reject);
  });
}

export async function getRowValues(tableHash: EntryHash, rowId: string, store: TablesStore) {
  return new Promise((resolve, reject) => {
    let unsubscribe: (() => void) | undefined;
    unsubscribe = store.boardList.boardData2.get(tableHash).subscribe((boardData) => {
      if (!boardData) {
        return; // Still loading
      }

      if (boardData.status === "error") {
        if (unsubscribe) unsubscribe();
        reject(new Error(`Error loading table: ${boardData.error}`));
        return;
      }

      if (boardData.status !== "complete") {
        return; // Still pending
      }

      if (!boardData.value || !boardData.value.latestState) {
        if (unsubscribe) unsubscribe();
        reject(new Error(`No latest state found for table ${tableHash}`));
        return;
      }

      const row = boardData.value.latestState.rows.find(r => r.id === rowId);
      if (!row) {
        if (unsubscribe) unsubscribe();
        reject(new Error(`Row with id ${rowId} not found in table ${tableHash}`));
        return;
      }

      const values = Object.values(row.cells).map(cell => {
        if (cell && cell.value) {
          return cell.value;
        }
        return "";
      });

      if (unsubscribe) unsubscribe();
      resolve(values);
    }, reject);
  });
}

export async function getTableValues(tableHash: EntryHash, store: TablesStore) {
  return new Promise((resolve, reject) => {
    let unsubscribe: (() => void) | undefined;
    unsubscribe = store.boardList.boardData2.get(tableHash).subscribe((boardData) => {
      if (!boardData) {
        return; // Still loading
      }

      if (boardData.status === "error") {
        if (unsubscribe) unsubscribe();
        reject(new Error(`Error loading table: ${boardData.error}`));
        return;
      }

      if (boardData.status !== "complete") {
        return; // Still pending
      }

      if (!boardData.value || !boardData.value.latestState) {
        if (unsubscribe) unsubscribe();
        reject(new Error(`No latest state found for table ${tableHash}`));
        return;
      }

      const values = Object.values(boardData.value.latestState.rows).map(row => {
        return Object.values(row.cells).map(cell => {
          if (cell && cell.value) {
            return cell.value;
          }
          return "";
        });
      });

      if (unsubscribe) unsubscribe();
      resolve(values);
    }, reject);
  });
}
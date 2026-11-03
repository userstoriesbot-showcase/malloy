import {DuckDBWASMConnection} from '@malloydata/db-duckdb/wasm';
import type {DuckDBBundles} from '@duckdb/duckdb-wasm';
// Fork-only (demo): serve the duckdb-wasm bundles from node_modules instead of
// jsDelivr, so the stories render with no network access.
import mvpModule from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import ehModule from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import ehWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

// The worker is started from a blob URL, so every bundle URL must be absolute.
const abs = (url: string) => new window.URL(url, window.location.href).href;

class LocalDuckDBWASMConnection extends DuckDBWASMConnection {
  override getBundles(): DuckDBBundles {
    return {
      mvp: {mainModule: abs(mvpModule), mainWorker: abs(mvpWorker)},
      eh: {mainModule: abs(ehModule), mainWorker: abs(ehWorker)},
    };
  }

  // The json, icu and parquet extensions are downloaded into
  // src/stories/static/duckdb-extensions by the demo install.
  protected override async init(): Promise<void> {
    await super.init();
    await this.connection?.query(
      `SET custom_extension_repository='${abs('/duckdb-extensions')}'`
    );
  }
}
import type {Preview} from '@storybook/html';
import registeredData from './registered_data.json';
import theme from './theme';

let memoConnection: LocalDuckDBWASMConnection | null = null;
async function createConnection() {
  if (memoConnection) return memoConnection;
  const connection = new LocalDuckDBWASMConnection('duckdb', null, undefined, {
    rowLimit: 1000,
  });
  await connection.connecting;
  for (const tableName of registeredData) {
    const tableUrl = `data/${tableName}`;
    const fullTableName = `static/${tableUrl}`;
    await connection.registerRemoteTable(
      fullTableName,
      new window.URL(tableUrl, window.location.href).toString()
    );
  }
  memoConnection = connection;
  return connection;
}

const preview: Preview = {
  parameters: {
    actions: {
      // argTypesRegex: '^on[A-Z].*'
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      theme,
    },
  },
  initialGlobals: {
    // Doing this with a lazy callback in the context because otherwise
    // Storybook was providing an empty Promise on first render when trying to directly createConnection here
    getConnection: () => createConnection(),
  },
};

export default preview;

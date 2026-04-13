import { Injectable } from '@nestjs/common';

@Injectable()
export class SsasAdomdService {
  private edge: any;
  private executeAdomd: any;

  constructor() {
    try {
      this.edge = require('edge-js');
      
      this.executeAdomd = this.edge.func(`
        #r "System.Data.dll"
        
        using System;
        using System.Data;
        using System.Data.OleDb;
        using System.Threading.Tasks;
        using System.Collections.Generic;

        public class Startup
        {
            public async Task<object> Invoke(object input)
            {
                dynamic data = input;
                string connectionString = data.connectionString;
                string query = data.query;

                var results = new List<Dictionary<string, object>>();

                using (OleDbConnection connection = new OleDbConnection(connectionString))
                {
                    try
                    {
                        connection.Open();
                        using (OleDbCommand command = new OleDbCommand(query, connection))
                        using (OleDbDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                var row = new Dictionary<string, object>();
                                for (int i = 0; i < reader.FieldCount; i++)
                                {
                                    string columnName = reader.GetName(i);
                                    object value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                                    row[columnName] = value;
                                }
                                results.Add(row);
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        throw new Exception(ex.Message);
                    }
                }
                return results;
            }
        }
      `);

      console.log('✅ ADOMD.NET service initialized (via OleDb)');
    } catch (error) {
      console.error('❌ Error initializing ADOMD.NET:', error.message);
      this.executeAdomd = null;
    }
  }

  private getConnectionString(databaseName?: string): string {
    const server = process.env.SSAS_SERVER || 'DESKTOP-QBV33CS';
    const catalog = databaseName && databaseName !== 'master' ? databaseName : '';
    
    // Construction propre de la chaîne MSOLAP
    let connString = `Provider=MSOLAP;Data Source=${server};Integrated Security=SSPI;`;
    if (catalog) {
        connString += `Initial Catalog=${catalog};`;
    }
    return connString;
  }

  async executeQuery(query: string, databaseName?: string): Promise<any[]> {
    if (!this.executeAdomd) {
      throw new Error('ADOMD.NET not available');
    }

    try {
      const connectionString = this.getConnectionString(databaseName);
      const result = await this.executeAdomd({
        connectionString,
        query,
      });

      return result || []; 
    } catch (error) {
      console.error(`❌ ADOMD Query Error on [${databaseName || 'System'}]:`, error.message);
      return []; 
    }
  }

  /**
 * Récupérer les bases de données
 */
async getDatabases(): Promise<any[]> {
  try {
    // Essayer plusieurs requêtes DMV différentes
    
    // Méthode 1 : DBSCHEMA_CATALOGS
    try {
      const query1 = `SELECT [CATALOG_NAME] FROM $SYSTEM.DBSCHEMA_CATALOGS`;
      const results1 = await this.executeQuery(query1);
      
      if (results1 && results1.length > 0) {
        console.log(`✅ Méthode 1 réussie : ${results1.length} bases trouvées`);
        return results1.map((row: any) => ({
          name: row.CATALOG_NAME || row.catalog_name || row.CatalogName,
          cubes: [],
        }));
      }
    } catch (error1) {
      console.log('⚠️ Méthode 1 échouée, essai méthode 2...');
    }

    // Méthode 2 : MDSCHEMA_CUBES avec DISTINCT CATALOG_NAME
    try {
      const query2 = `SELECT DISTINCT [CATALOG_NAME] FROM $SYSTEM.MDSCHEMA_CUBES`;
      const results2 = await this.executeQuery(query2, 'master');
      
      if (results2 && results2.length > 0) {
        console.log(`✅ Méthode 2 réussie : ${results2.length} bases trouvées`);
        return results2.map((row: any) => ({
          name: row.CATALOG_NAME || row.catalog_name || row.CatalogName,
          cubes: [],
        }));
      }
    } catch (error2) {
      console.log('⚠️ Méthode 2 échouée, essai méthode 3...');
    }

    // Méthode 3 : Utiliser une connexion sans Initial Catalog
    try {
      const query3 = `SELECT * FROM $SYSTEM.DBSCHEMA_CATALOGS`;
      const results3 = await this.executeQueryWithoutCatalog(query3);
      
      if (results3 && results3.length > 0) {
        console.log(`✅ Méthode 3 réussie : ${results3.length} bases trouvées`);
        return results3.map((row: any) => ({
          name: row.CATALOG_NAME || row.catalog_name || row.CatalogName,
          cubes: [],
        }));
      }
    } catch (error3) {
      console.log('⚠️ Méthode 3 échouée');
    }

    // Si toutes les méthodes échouent, retourner liste hardcodée
    console.log('⚠️ Toutes les méthodes échouées, utilisation liste hardcodée');
    return this.getHardcodedDatabases();
    
  } catch (error) {
    console.error('❌ Error fetching databases:', error.message);
    return this.getHardcodedDatabases();
  }
}

/**
 * Exécuter requête sans Initial Catalog
 */
private async executeQueryWithoutCatalog(query: string): Promise<any[]> {
  if (!this.executeAdomd) {
    throw new Error('ADOMD.NET not available');
  }

  try {
    const server = process.env.SSAS_SERVER || 'DESKTOP-QBV33CS';
    
    // Connexion sans Initial Catalog
    const connectionString = `Provider=MSOLAP;Data Source=${server};Integrated Security=SSPI;`;
    
    console.log(`🔍 Executing query without catalog`);
    
    const result = await this.executeAdomd({
      connectionString,
      query,
    });

    return result;
  } catch (error) {
    console.error('❌ Query Error (no catalog):', error.message);
    throw error;
  }
}

/**
 * Liste hardcodée des bases de données
 */
private getHardcodedDatabases(): any[] {
  console.log('📋 Using hardcoded database list');
  return [
    { name: 'communication', cubes: [] },
    { name: 'DSnarou', cubes: [] },
    { name: 'pfechaima_SSAS', cubes: [] },
    { name: 'Sales_cubes', cubes: [] },
  ];
}
/**
 * Récupérer les cubes d'une base
 */
async getCubes(databaseName: string): Promise<any[]> {
  try {
    // Essayer plusieurs méthodes
    
    // Méthode 1 : MDSCHEMA_CUBES standard
    try {
      const query1 = `
        SELECT CUBE_NAME, DESCRIPTION 
        FROM $SYSTEM.MDSCHEMA_CUBES 
        WHERE CUBE_TYPE <> 2
      `;
      
      const results1 = await this.executeQuery(query1, databaseName);
      
      if (results1 && results1.length > 0) {
        console.log(`✅ Méthode 1 : ${results1.length} cubes trouvés`);
        return results1.map((row: any) => ({
          name: row.CUBE_NAME || row.cube_name || row.CubeName,
          description: row.DESCRIPTION || row.description || '',
        }));
      }
    } catch (error1) {
      console.log('⚠️ Méthode 1 échouée, essai méthode 2...');
    }

    // Méthode 2 : Sans restriction CUBE_TYPE
    try {
      const query2 = `
        SELECT CUBE_NAME, DESCRIPTION, CUBE_TYPE
        FROM $SYSTEM.MDSCHEMA_CUBES
      `;
      
      const results2 = await this.executeQuery(query2, databaseName);
      
      if (results2 && results2.length > 0) {
        // Filtrer côté JavaScript
        const cubes = results2.filter((row: any) => {
          const cubeType = parseInt(row.CUBE_TYPE || row.cube_type || '1');
          return cubeType !== 2; // Exclure les dimensions
        });
        
        console.log(`✅ Méthode 2 : ${cubes.length} cubes trouvés (${results2.length} total)`);
        
        return cubes.map((row: any) => ({
          name: row.CUBE_NAME || row.cube_name || row.CubeName,
          description: row.DESCRIPTION || row.description || '',
        }));
      }
    } catch (error2) {
      console.log('⚠️ Méthode 2 échouée, essai méthode 3...');
    }

    // Méthode 3 : Query simplifié
    try {
      const query3 = `SELECT CUBE_NAME FROM $SYSTEM.MDSCHEMA_CUBES`;
      
      const results3 = await this.executeQuery(query3, databaseName);
      
      if (results3 && results3.length > 0) {
        console.log(`✅ Méthode 3 : ${results3.length} cubes trouvés`);
        
        return results3.map((row: any) => ({
          name: row.CUBE_NAME || row.cube_name || row.CubeName,
          description: '',
        }));
      }
    } catch (error3) {
      console.log('⚠️ Méthode 3 échouée');
    }

    // Si toutes les méthodes échouent, utiliser liste hardcodée
    console.log('⚠️ Toutes les méthodes échouées, utilisation liste hardcodée');
    return this.getHardcodedCubes(databaseName);
    
  } catch (error) {
    console.error('Error fetching cubes:', error.message);
    return this.getHardcodedCubes(databaseName);
  }
}

/**
 * Liste hardcodée des cubes
 */
private getHardcodedCubes(databaseName: string): any[] {
  console.log(`📦 Using hardcoded cubes for ${databaseName}`);
  
  const cubesMap: any = {
    communication: [
      { name: 'cubecom', description: 'Cube de communication' },
    ],
    DSnarou: [
      { name: 'DSPRATIQUE', description: 'Cube DSPRATIQUE' },
    ],
    pfechaima_SSAS: [
      { name: 'Adventure Works DW2022', description: 'Adventure Works Data Warehouse' },
    ],
    Sales_cubes: [
      { name: 'Sales_cubes', description: 'Cube de ventes' },
    ],
  };
  
  return cubesMap[databaseName] || [];
}

  // --- Garder les autres méthodes (Measures, Dimensions) telles quelles ---
  
  async getMeasures(databaseName: string, cubeName: string): Promise<any[]> {
    const query = `SELECT MEASURE_NAME, DATA_TYPE, MEASURE_AGGREGATOR, DEFAULT_FORMAT_STRING FROM $SYSTEM.MDSCHEMA_MEASURES WHERE CUBE_NAME = '${cubeName}'`;
    const results = await this.executeQuery(query, databaseName);
    return results.map((row: any) => ({
      name: row.MEASURE_NAME,
      dataType: row.DATA_TYPE || 'Numeric',
      aggregationType: this.getAggregationType(row.MEASURE_AGGREGATOR),
      format: row.DEFAULT_FORMAT_STRING || '#,##0.00',
    }));
  }

  private getAggregationType(code: any): string {
    const types: any = { 1: 'Sum', 2: 'Count', 3: 'Min', 4: 'Max', 5: 'Avg', 127: 'DistinctCount' };
    return types[code] || 'Sum';
  }

  async getDimensions(databaseName: string, cubeName: string): Promise<any[]> {
    const query = `SELECT DIMENSION_NAME, DIMENSION_TYPE FROM $SYSTEM.MDSCHEMA_DIMENSIONS WHERE CUBE_NAME = '${cubeName}' AND DIMENSION_IS_VISIBLE = TRUE`;
    const results = await this.executeQuery(query, databaseName);
    return results.map((row: any) => ({
      name: row.DIMENSION_NAME,
      type: this.getDimensionType(row.DIMENSION_TYPE),
      hierarchies: [],
      attributes: [],
    }));
  }

  private getDimensionType(code: any): string {
    const types: any = { 1: 'Time', 2: 'Standard', 3: 'Geography', 5: 'Organization' };
    return types[code] || 'Standard';
  }

  async getCubeSchema(databaseName: string, cubeName: string): Promise<any> {
    const [measures, dimensions] = await Promise.all([
      this.getMeasures(databaseName, cubeName),
      this.getDimensions(databaseName, cubeName),
    ]);
    return { cubeName, measures, dimensions };
  }

  async executeMDX(databaseName: string, mdxQuery: string): Promise<any> {
    const results = await this.executeQuery(mdxQuery, databaseName);
    return {
      data: results,
      columns: results.length > 0 ? Object.keys(results[0]) : [],
      rowsCount: results.length,
      executionTimeMs: 0,
    };
  }
}
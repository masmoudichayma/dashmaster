import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { SsasPowershellService } from './ssas-powershell.service';

@Injectable()
export class SsasService {
  constructor(private readonly powershellService: SsasPowershellService) {}

  async connectToServer(serverName: string, port: number) {
    try {
      console.log(`🔌 Connecting to SSAS via PowerShell: ${serverName}`);

      const databases = await this.getDatabasesList(serverName, port);

      return {
        success: true,
        message: `Connected to ${serverName} via PowerShell`,
        databases,
      };
    } catch (error) {
      console.error('❌ Connection error:', error);

      return {
        success: false,
        message: `Failed to connect: ${error.message}`,
        databases: [],
      };
    }
  }

  async getDatabasesList(serverName: string, port: number) {
    console.log('📊 Getting databases via PowerShell...');

    try {
      const databases = await this.powershellService.getDatabases();

      if (databases && databases.length > 0) {
        console.log(`✅ Found ${databases.length} databases`);
        return databases;
      }

      console.log('⚠️ PowerShell returned 0 databases');
      return [];
    } catch (error) {
      console.error('❌ Error:', error.message);
      return [];
    }
  }

  async getCubesForDatabase(serverName: string, databaseName: string) {
    try {
      console.log(`📊 Fetching cubes for: ${databaseName}`);
      const cubes = await this.powershellService.getCubes(databaseName);

      console.log(`✅ Found ${cubes.length} cubes`);
      return { cubes };
    } catch (error) {
      console.error('❌ Error fetching cubes:', error.message);
      return { cubes: [] };
    }
  }

  async getCubeSchema(serverName: string, databaseName: string, cubeName: string) {
    try {
      console.log(`🧊 Fetching schema: ${cubeName} in ${databaseName}`);
      const schema = await this.powershellService.getCubeSchema(databaseName, cubeName);

      console.log(`✅ Schema loaded: ${schema.measures?.length || 0} measures, ${schema.dimensions?.length || 0} dimensions`);
      return schema;
    } catch (error) {
      console.error('❌ Error fetching schema:', error.message);
      throw new HttpException(
        { message: 'Failed to fetch cube schema', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async executeMDX(serverName: string, databaseName: string, mdxQuery: string) {
  try {
    console.log(`🚀 Exécution MDX sur la base : ${databaseName}`);
    const startTime = Date.now();

    // On utilise le service PowerShell que tu as déjà injecté
    const result = await this.powershellService.executeMdxQuery(databaseName, mdxQuery);

    const executionTimeMs = Date.now() - startTime;

    return {
      data: result.rows || [],     // Les données récupérées
      columns: result.columns || [], // Les noms des colonnes
      rowsCount: result.rows?.length || 0,
      executionTimeMs,
    };
  } catch (error) {
    console.error('❌ Erreur d\'exécution MDX:', error.message);
    return { data: [], columns: [], error: error.message };
  }
}
}
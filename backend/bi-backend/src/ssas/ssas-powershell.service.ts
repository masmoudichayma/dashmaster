import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class SsasPowershellService {
  private readonly serverName = process.env.SSAS_SERVER || 'DESKTOP-QBV33CS';
  private readonly scriptsPath = path.join(process.cwd(), 'scripts');

  /**
   * MÉTHODE 1 : Pour exécuter un fichier .ps1 existant
   */
  private async executePowerShell(scriptName: string, params: string[] = []): Promise<any> {
    try {
      const scriptPath = path.join(this.scriptsPath, scriptName);
      const paramsStr = params.join(' ');
      const command = `powershell -ExecutionPolicy Bypass -NoProfile -File "${scriptPath}" ${paramsStr}`;
      
      const { stdout } = await execAsync(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
      return this.parseJsonOutput(stdout);
    } catch (error) {
      console.error(`❌ Erreur fichier PS (${scriptName}):`, error.message);
      throw error;
    }
  }

  /**
   * MÉTHODE 2 : Pour exécuter du code PowerShell brut (Inline)
   * Indispensable pour l'exécution dynamique du MDX
   */
  private async executeCommand(script: string): Promise<string> {
    try {
      // On utilise Base64 pour éviter les problèmes de caractères spéciaux dans le MDX
      const encodedScript = Buffer.from(script, 'utf16le').toString('base64');
      const command = `powershell.exe -NoProfile -EncodedCommand ${encodedScript}`;

      const { stdout, stderr } = await execAsync(command);
      if (stderr) console.warn('⚠️ PS Warning:', stderr);
      
      return stdout.trim();
    } catch (error) {
      throw new Error(`Erreur d'exécution système : ${error.message}`);
    }
  }

  /**
   * Utilitaire pour parser le JSON proprement
   */
  private parseJsonOutput(output: string): any {
    const cleanOutput = output.trim();
    if (!cleanOutput) return [];
    try {
      return JSON.parse(cleanOutput);
    } catch (e) {
      console.error('❌ Erreur de parsing JSON. Sortie brute:', cleanOutput);
      return [];
    }
  }

  // --- MÉTHODES PUBLIQUES ---

  async getDatabases(): Promise<any[]> {
    return this.executePowerShell('Get-SSAS-Databases.ps1', [`-ServerName "${this.serverName}"`]);
  }

  async getCubes(databaseName: string): Promise<any[]> {
    return this.executePowerShell('Get-SSAS-Cubes.ps1', [
      `-ServerName "${this.serverName}"`,
      `-DatabaseName "${databaseName}"`
    ]);
  }

  async getCubeSchema(databaseName: string, cubeName: string): Promise<any> {
    return this.executePowerShell('Get-SSAS-Schema.ps1', [
      `-ServerName "${this.serverName}"`,
      `-DatabaseName "${databaseName}"`,
      `-CubeName "${cubeName}"`
    ]);
  }

  /**
   * Exécution réelle du MDX généré par l'IA
   */
  async executeMdxQuery(databaseName: string, mdxQuery: string): Promise<any> {
    const script = `
      $server = "${this.serverName}"
      $database = "${databaseName}"
      $query = @"
${mdxQuery}
"@
      # Charger ADOMD
      [System.Reflection.Assembly]::LoadWithPartialName("Microsoft.AnalysisServices.AdomdClient") | Out-Null
      $conn = New-Object Microsoft.AnalysisServices.AdomdClient.AdomdConnection("Data Source=$server;Initial Catalog=$database;")
      
      try {
          $conn.Open()
          $cmd = New-Object Microsoft.AnalysisServices.AdomdClient.AdomdCommand($query, $conn)
          $adapter = New-Object Microsoft.AnalysisServices.AdomdClient.AdomdDataAdapter($cmd)
          $dataset = New-Object System.Data.DataSet
          $adapter.Fill($dataset) | Out-Null
          $dataset.Tables[0] | ConvertTo-Json -Depth 2
      } finally {
          $conn.Close()
      }
    `;

    try {
      const rawResult = await this.executeCommand(script);
      const data = this.parseJsonOutput(rawResult);
      
      // Assurer que c'est toujours un tableau
      const rows = Array.isArray(data) ? data : [data];
      
      return {
        columns: rows.length > 0 ? Object.keys(rows[0]) : [],
        rows: rows
      };
    } catch (error) {
      throw new Error(`Erreur SSAS MDX : ${error.message}`);
    }
  }
}
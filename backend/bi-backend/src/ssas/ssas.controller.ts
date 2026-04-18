import { Controller, Post, Get, Body, Query, HttpException, HttpStatus } from '@nestjs/common';
import { SsasService } from './ssas.service';

@Controller('ssas')
export class SsasController {
  constructor(private readonly ssasService: SsasService) {}

  @Post('connect')
  async connect(@Body() body: { serverName: string; port: number }) {
    return this.ssasService.connectToServer(body.serverName, body.port);
  }

  @Get('databases')
  async getDatabases(
    @Query('serverName') serverName: string,
    @Query('port') port: string,
  ) {
    const databases = await this.ssasService.getDatabasesList(
      serverName,
      parseInt(port),
    );
    return { databases };
  }

  @Get('cubes')
  async getCubes(
    @Query('serverName') serverName: string,
    @Query('databaseName') databaseName: string,
  ) {
    return this.ssasService.getCubesForDatabase(serverName, databaseName);
  }

  @Get('cube-schema')
  async getCubeSchema(
    @Query('serverName') serverName: string,
    @Query('databaseName') databaseName: string,
    @Query('cubeName') cubeName: string,
  ) {
    return this.ssasService.getCubeSchema(serverName, databaseName, cubeName);
  }

  // --- NOUVELLE ROUTE POUR LE DIAGRAMME ---
  @Get('cube-diagram')
  async getCubeDiagram(
    @Query('serverName') serverName: string,
    @Query('databaseName') databaseName: string,
    @Query('cubeName') cubeName: string,
  ) {
    return this.ssasService.getCubeDiagram(serverName, databaseName, cubeName);
  }
  
  @Post('execute-mdx')
  async executeMDX(
    @Body()
    body: {
      serverName: string;
      databaseName: string;
      mdxQuery: string;
    },
  ) {
    return this.ssasService.executeMDX(
      body.serverName,
      body.databaseName,
      body.mdxQuery,
    );
  }
}
import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SsasService {

  private PYTHON_URL = 'http://127.0.0.1:8000';

  async getDimensions() {
    const res = await axios.get(`${this.PYTHON_URL}/dimensions`);
    return res.data;
  }

  async getMeasures() {
    const res = await axios.get(`${this.PYTHON_URL}/measures`);
    return res.data;
  }

  async getHierarchies() {
    const res = await axios.get(`${this.PYTHON_URL}/hierarchies`);
    return res.data;
  }

  async getCalculatedMeasures() {
    const res = await axios.get(`${this.PYTHON_URL}/calculated-measures`);
    return res.data;
  }

  async getMetadata() {
    return {
      dimensions: await this.getDimensions(),
      measures: await this.getMeasures(),
      hierarchies: await this.getHierarchies(),
      calculatedMeasures: await this.getCalculatedMeasures(),
    };
  }
}
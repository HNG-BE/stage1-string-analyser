import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AppService } from './app.service';

@Controller('strings')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  async analyseString(@Body('value') value: string): Promise<any> {
    const result = await this.appService.stringAnalyser(value);
    return {
      id: result.id,
      value: result.value,
      properties: result.properties,
      created_at: result.created_at,
    };
  }

  @Get('filter-by-natural-language')
  async getNatural(@Query('q') query: string): Promise<any> {
    const filtered = this.appService.filterStringsNatural(query);
    return {
      data: filtered,
      count: filtered.length,
      query,
    };
  }

  @Get(':value')
  async getStringAnalysis(@Param('value') value: string): Promise<any> {
    const result = this.appService.getSpecificString(value);
    return {
      id: result.id,
      value: result.value,
      properties: result.properties,
      created_at: result.created_at,
    };
  }

  @Get()
  async getFilteredStrings(@Query() query: Record<string, any>): Promise<any> {
    if (Object.keys(query).length > 0) {
      const filtered = this.appService.getFilteredStrings(query);
      return {
        data: filtered,
        count: filtered.length,
        filters_applied: query,
      };
    } else {
      const all = this.appService.getAllStrings();
      return { data: all, count: all.length };
    }
  }

  @Delete(':value')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteString(@Param('value') value: string): Promise<void> {
    return this.appService.deleteString(value);
  }
}

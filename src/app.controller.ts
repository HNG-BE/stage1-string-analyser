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
  Res,
} from '@nestjs/common';
import { AppService } from './app.service';

@Controller('strings')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  async analyseString(@Body('value') value: string, @Res() res): Promise<any> {
    if (typeof value !== 'string') {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid data type for 'value'. Must be string.",
      });
    }
    if (!value || value.trim() === '') {
      return res
        .status(400)
        .json({ statusCode: 400, message: "Missing or empty 'value' field." });
    }
    try {
      const result = await this.appService.stringAnalyser(value);
      if ('statusCode' in result && result.statusCode === 409) {
        return res.status(409).json(result);
      }
      return res.status(201).json(result);
    } catch (err) {
      return res.status(err.status || 500).json({
        statusCode: err.status || 500,
        message: err.message || 'Internal server error',
      });
    }
  }

  @Get('filter-by-natural-language')
  async getNatural(@Query('q') query: string, @Res() res): Promise<any> {
    try {
      const filtered = await this.appService.filterStringsNatural(query);
      return res.status(200).json({
        data: filtered,
        count: filtered.length,
        query: query,
      });
    } catch (err) {
      if (err.status === 404) {
        return res.status(200).json({ data: [], count: 0, query: query });
      }
      return res.status(err.status || 500).json({
        statusCode: err.status || 500,
        message: err.message || 'Internal server error',
      });
    }
  }

  @Get(':value')
  async getStringAnalysis(@Param('value') value: string): Promise<any> {
    return this.appService.getSpecificString(value);
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

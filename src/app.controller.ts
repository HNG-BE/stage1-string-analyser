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
      statusCode: HttpStatus.CREATED,
      data: result,
    };
  }

  @Get()
  async getFilteredStrings(@Query() query: Record<string, any>): Promise<any> {
    if (Object.keys(query).length > 0) {
      const filtered = this.appService.getFilteredStrings(query);
      return {
        statusCode: HttpStatus.OK,
        data: filtered,
        count: filtered.length,
        filters_applied: query,
      };
    } else {
      const all = this.appService.getAllStrings();
      return { statusCode: HttpStatus.OK, data: all, count: all.length };
    }
  }

  @Get(':value')
  async getStringAnalysis(@Param('value') value: string): Promise<any> {
    const result = this.appService.getSpecificString(value);
    return {
      statusCode: HttpStatus.OK,
      data: result,
    };
  }

  @Get('filter-by-natural-language')
  async getNatural(@Query('q') query: string): Promise<any> {
    const filtered = this.appService.filterStringsNatural(query);
    return {
      statusCode: HttpStatus.OK,
      data: filtered,
      count: filtered.length,
      query,
    };
  }

  @Delete(':value')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteString(@Param('value') value: string): Promise<void> {
    return this.appService.deleteString(value);
  }
}

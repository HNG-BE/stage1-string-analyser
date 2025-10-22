import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

interface StringAnalysis {
  id: string;
  value: string;
  properties: {
    length: number;
    is_palindrome: boolean;
    unique_characters: number;
    word_count: number;
    sha256_hash: string;
    character_frequency_map: Record<string, number>;
  };
  created_at: string;
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly filePath = path.join(__dirname, '..', 'data.json');
  private strings: StringAnalysis[] = [];

  constructor() {
    this.loadData();
  }

  private loadData() {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileData = fs.readFileSync(this.filePath, 'utf8');
        this.strings = JSON.parse(fileData || '[]');
      } else {
        this.strings = [];
      }
    } catch (err) {
      this.logger.error(`Failed to load data file: ${err.message}`);
      this.strings = [];
    }
  }

  private saveData() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.strings, null, 2));
    } catch (err) {
      this.logger.error(`Failed to save data file: ${err.message}`);
    }
  }

  public async stringAnalyser(value: string) {
    if (typeof value !== 'string') {
      throw new HttpException(
        "Invalid data type for 'value'. Must be string.",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!value || value.trim() === '') {
      throw new HttpException(
        "Missing or empty 'value' field.",
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingIndex = this.strings.findIndex((str) => str.value === value);
    if (existingIndex !== -1) {
      throw new HttpException('String already exists', HttpStatus.CONFLICT);
    }

    const length = value.length;
    const normalized = value.toLowerCase();
    const isPalindrome = normalized === normalized.split('').reverse().join('');
    const uniqueChars = new Set(value).size;
    const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
    const sha256Hash = crypto.createHash('sha256').update(value).digest('hex');
    const charFrequencyMap: Record<string, number> = {};

    for (const char of value) {
      charFrequencyMap[char] = (charFrequencyMap[char] || 0) + 1;
    }

    const analysis: StringAnalysis = {
      id: sha256Hash,
      value,
      properties: {
        length,
        is_palindrome: isPalindrome,
        unique_characters: uniqueChars,
        word_count: wordCount,
        sha256_hash: sha256Hash,
        character_frequency_map: charFrequencyMap,
      },
      created_at: new Date().toISOString(),
    };

    this.strings.push(analysis);
    this.saveData();
    return analysis;
  }

  public getAllStrings() {
    return this.strings;
  }

  public getSpecificString(value: string) {
    const foundString = this.strings.find((str) => str.value === value);
    if (!foundString) {
      throw new HttpException('String not found', HttpStatus.NOT_FOUND);
    }
    // Return full consistent object
    return foundString;
  }

  public getFilteredStrings(query: any) {
    let results = [...this.strings];

    if ('is_palindrome' in query) {
      const flag = query.is_palindrome === 'true';
      results = results.filter((s) => s.properties.is_palindrome === flag);
    }

    if ('min_length' in query) {
      const min = Number(query.min_length);
      results = results.filter((s) => s.properties.length >= min);
    }

    if ('max_length' in query) {
      const max = Number(query.max_length);
      results = results.filter((s) => s.properties.length <= max);
    }

    if ('word_count' in query) {
      const count = Number(query.word_count);
      results = results.filter((s) => s.properties.word_count === count);
    }

    if ('contains_character' in query) {
      const char = query.contains_character.toLowerCase();
      results = results.filter((s) => s.value.toLowerCase().includes(char));
    }

    return results;
  }

  // Natural language filter
  public filterStringsNatural(queryText: string) {
    if (!queryText || typeof queryText !== 'string') {
      throw new HttpException(
        'Query must be a valid string',
        HttpStatus.BAD_REQUEST,
      );
    }

    queryText = queryText.toLowerCase();
    let results = [...this.strings];

    if (queryText.includes('palindrome')) {
      results = results.filter((s) => s.properties.is_palindrome);
    }

    const minLengthMatch = queryText.match(/longer than (\d+)/);
    if (minLengthMatch) {
      const min = parseInt(minLengthMatch[1]);
      results = results.filter((s) => s.properties.length > min);
    }

    const maxLengthMatch = queryText.match(/shorter than (\d+)/);
    if (maxLengthMatch) {
      const max = parseInt(maxLengthMatch[1]);
      results = results.filter((s) => s.properties.length < max);
    }

    const wordCountMatch = queryText.match(/(\d+)\s+words?/);
    if (wordCountMatch) {
      const count = parseInt(wordCountMatch[1]);
      results = results.filter((s) => s.properties.word_count === count);
    }

    const containsMatch = queryText.match(
      /contain(?:s|ing)? (?:the word|character)?\s*["']?([a-z0-9]+)["']?/,
    );
    if (containsMatch) {
      const char = containsMatch[1];
      results = results.filter((s) => s.value.toLowerCase().includes(char));
    }

    return results;
  }

  public deleteString(value: string) {
    const index = this.strings.findIndex((s) => s.value === value);
    if (index === -1) {
      throw new HttpException(
        'String does not exist in the system',
        HttpStatus.NOT_FOUND,
      );
    }
    this.strings.splice(index, 1);
    this.saveData();
    return;
  }
}

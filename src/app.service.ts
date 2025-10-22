import { Injectable, HttpException, Logger } from '@nestjs/common';
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

  // Load existing data from file (if available)
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

  //Save data to file after changes
  private saveData() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.strings, null, 2));
    } catch (err) {
      this.logger.error(`Failed to save data file: ${err.message}`);
    }
  }

  public async stringAnalyser(value: string) {
    //length of the string
    const length = value.length;
    //Check if string is palindrome
    const isPalindrome =
      value === value.toLowerCase().split('').reverse().join('');
    //Check for unique characters in the string
    const uniqueChars = new Set(value).size;
    //Check the word count in the string
    const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
    //Generate sha256 hash for uninque id of the string
    const crypto = require('crypto');
    const sha256Hash = crypto.createHash('sha256').update(value).digest('hex');
    //character frequency map
    const charFrequencyMap: Record<string, number> = {};
    for (const char of value) {
      charFrequencyMap[char] = (charFrequencyMap[char] || 0) + 1;
    }

    //Invalid data type for value (must be string)
    const invalidDataType = typeof value !== 'string';
    if (invalidDataType) {
      this.logger.log(`Invalid data type for value`);
      throw new HttpException('Invalid data type for value', 422);
    }

    //check if string already exists
    const existingIndex = this.strings.findIndex((str) => str.value === value);
    if (existingIndex !== -1) {
      this.logger.log('String already exists');
      throw new HttpException('String already exists', 409);
    }

    //Invalid req (empty string/passing a non-string value)
    const invalidString =
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '');
    if (invalidString) {
      this.logger.log(`Invalid string value`);
      throw new HttpException('Invalid string value', 400);
    }

    const analysis: StringAnalysis = {
      id: sha256Hash,
      value: value,
      properties: {
        length: length,
        is_palindrome: isPalindrome,
        unique_characters: uniqueChars,
        word_count: wordCount,
        sha256_hash: sha256Hash,
        character_frequency_map: charFrequencyMap,
      },
      created_at: new Date().toISOString(),
    };

    //Store the string in the interface shape
    this.strings.push(analysis);
    this.saveData();
    this.logger.log(`String analysed and stored successfully`);

    return analysis;
  }

  public getAllStrings() {
    return this.strings;
  }

  getSpecificString(value: StringAnalysis['value']) {
    let foundString = this.strings.find((str) => str.value === value);
    if (!foundString) {
      this.logger.log(`String not found`);
      throw new HttpException('String not found', 404);
    }

    foundString = {
      id: foundString.id,
      value: foundString.value,
      properties: {
        length: foundString.properties.length,
        is_palindrome: foundString.properties.is_palindrome,
        unique_characters: foundString.properties.unique_characters,
        word_count: foundString.properties.word_count,
        sha256_hash: foundString.properties.sha256_hash,
        character_frequency_map: foundString.properties.character_frequency_map,
      },
      created_at: foundString.created_at,
    };

    return foundString;
  }

  getFilteredStrings(query: any) {
    let results = this.strings;

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

  // Natural Language Filter — interpret plain English queries
  public filterStringsNatural(queryText: string): any {
    if (!queryText || typeof queryText !== 'string') {
      throw new HttpException('Query must be a valid string', 400);
    }

    queryText = queryText.toLowerCase();
    let results = [...this.strings];

    if (results.length === 0) {
      throw new HttpException('No strings exist in the system', 404);
    }

    // Detect filters using simple keyword matching
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
      /containing (?:the word|character)?\s*["']?([a-z0-9]+)["']?/,
    );
    if (containsMatch) {
      const char = containsMatch[1];
      results = results.filter((s) => s.value.toLowerCase().includes(char));
    }

    if (results.length === 0) {
      throw new HttpException('No results found for matching your query', 404);
    }

    return results;
  }

  public deleteString(value: string) {
    const index = this.strings.findIndex((s) => s.value === value);
    if (index === -1) {
      throw new HttpException('String does not exist in the system', 404);
    }

    this.strings.splice(index, 1);
    this.saveData(); // ✅ consistent and reliable
    return;
  }

  // deleteString(value: string): Promise<any> | any {
  //   const all = this.getAllStrings();
  //   const index = all.findIndex((s) => s.value === value);
  //   if (index === -1) {
  //     return {
  //       statusCode: 404,
  //       message: 'String does not exist in the system',
  //     };
  //   }
  //   all.splice(index, 1);
  //   // Save updated list
  //   const fs = require('fs');
  //   fs.writeFileSync('./data.json', JSON.stringify(all, null, 2), 'utf-8');
  //   return; // 204 No Content
  // }
}

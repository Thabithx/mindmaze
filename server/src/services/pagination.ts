import {Types} from 'mongoose';

export class PaginationError extends Error {}

export function readPagination(query: Record<string, unknown>) {
  const read = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
      throw new PaginationError('Page and page size must be positive whole numbers.');
    }
    return Math.min(Number(value), max);
  };
  return { page: read(query.page, 1, 1_000_000), pageSize: read(query.pageSize, 20, 100) };
}

export function pageInfo(total: number, requested: {page: number; pageSize: number}) {
  const totalPages = Math.max(1, Math.ceil(total / requested.pageSize));
  const page = Math.min(requested.page, totalPages);
  return { page, pageSize: requested.pageSize, total, totalPages };
}

export function queryText(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 120) : '';
}

export function literalSearch(value: unknown) {
  const text = queryText(value);
  return text ? new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : undefined;
}

export function userListFilter(query: Record<string, unknown>) {
  const filter: any = {};
  const stream = queryText(query.stream);
  if (stream && stream !== 'all') filter.stream = stream;
  const search = literalSearch(query.q);
  if (search) filter.$or = ['name','email','indexNumber','whatsappNumber','mobileNumber','phoneNumber','phone'].map(field => ({[field]:search}));
  return filter;
}

export function paperListFilter(query: Record<string, unknown>) {
  const filter: any = {};
  if (typeof query.ids === 'string') {
    const ids=query.ids ? query.ids.split(',') : [];
    if (ids.length>100 || ids.some(id=>!/^[a-f\d]{24}$/i.test(id))) throw new PaginationError('Invalid paper selection.');
    // Aggregations do not cast IDs; construct ObjectIds to use the existing _id index.
    filter._id={$in:ids.map(id=>new Types.ObjectId(id))};
  }
  for (const field of ['subject','medium','type','syllabus']) {
    const value = queryText(query[field]);
    if (value && value !== 'All') filter[field] = value;
  }
  const year = queryText(query.year);
  if (year && year !== 'All') {
    if (!/^\d{4}(-\d{4})?$/.test(year)) throw new PaginationError('Invalid year filter.');
    const [from, to = from] = year.split('-').map(Number);
    if (from > to) throw new PaginationError('Invalid year range.');
    filter.year = { $gte: from, $lte: to };
  }
  const stream = queryText(query.stream);
  if (stream && stream !== 'All') {
    const aliases: Record<string, string[]> = {Maths:['Maths','Physical Science','Both'],Bio:['Bio','Biological Science','Both'],'Non-stream':['Non-stream']};
    filter.$and = [{$or:[{streams:stream},{$and:[{$or:[{streams:{$exists:false}},{streams:{$size:0}}]},{stream:{$in:aliases[stream] || [stream]}}]}]}];
  }
  const search = literalSearch(query.q);
  if (search) {
    filter.$or = ['title','subject','topicTags','streams','stream'].map(field=>({[field]:search}));
    if (/^\d{4}$/.test(queryText(query.q))) filter.$or.push({year:Number(query.q)});
  }
  return filter;
}

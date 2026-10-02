const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript');
const base=path.resolve(__dirname,'../src');
function compile(file,mocks={}) {
  const exports={};
  const source=ts.transpileModule(fs.readFileSync(path.join(base,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInNewContext(source,{exports,require:n=>n in mocks?mocks[n]:require(n),console,Buffer,URL,process:{env:{}}});
  return exports;
}
const paging=compile('services/pagination.ts');
assert.equal(paging.readPagination({}).pageSize,20);
assert.equal(paging.readPagination({pageSize:'1000'}).pageSize,100);
for(const value of ['0','-1','1.5','NaN','Infinity','1e3',[],{},'9007199254740992'])assert.throws(()=>paging.readPagination({page:value}));
assert.equal(paging.pageInfo(21,{page:9,pageSize:20}).page,2);
assert.equal(paging.pageInfo(0,{page:9,pageSize:20}).page,1);
assert.equal(paging.literalSearch('a.b+[x]').test('a.b+[x]'),true);
assert.equal(paging.literalSearch('a.b+[x]').test('azbbx'),false);
assert.throws(()=>paging.paperListFilter({year:'2026-2020'}));
assert.throws(()=>paging.paperListFilter({year:'bad'}));
assert.equal(paging.paperListFilter({year:'2026'}).year.$gte,2026);
assert.equal(paging.paperListFilter({year:'2020-2026'}).year.$lte,2026);
assert.equal(paging.paperListFilter({q:'2026'}).$or.some(f=>f.year===2026),true);
assert.equal(paging.userListFilter({stream:'all'}).stream,undefined);
assert.equal(paging.userListFilter({stream:'Bio',q:'last student'}).stream,'Bio');
assert.equal(paging.userListFilter({q:'test'}).$or.length,6);
assert.throws(()=>paging.paperListFilter({ids:'not-an-id'}));
assert.equal(paging.paperListFilter({ids:''})._id.$in.length,0);
assert.equal(String(paging.paperListFilter({ids:'0123456789abcdef01234567'})._id.$in[0]),'0123456789abcdef01234567');
// Exercise handlers with model spies; no production database or credentials needed.
const handlers={};
const router={param(){},get(p,...f){handlers['GET '+p]=f;},put(){},post(){},delete(){}};
const protect=()=>{},adminOnly=()=>{};
let total=45,seen={},pipeline;
const user={_id:'u-21',name:'Last student',whatsappNumber:'0700000000'};
const userModel={countDocuments:async filter=>{seen.countFilter=filter;return total;},find:filter=>{
  seen.filter=filter;
  const q={select(v){seen.select=v;return q;},sort(v){seen.sort=v;return q;},skip(v){seen.skip=v;return q;},limit(v){seen.limit=v;return q;},lean:async()=>[user]};return q;
}};
const empty={};
compile('routes/adminRoutes.ts',{
  express:{Router:()=>router},'../services/pagination.js':paging,
  '../services/telegramVerification.js':{telegramState:()=>({accountVerified:true})},'../services/batchConfig.js':empty,
  '../models/User.js':userModel,...Object.fromEntries(['Course','Timetable','Task','Mistake','SyllabusProgress','SiteConfig'].map(x=>['../models/'+x+'.js',empty])),
  '../middleware/authMiddleware.js':{protect,adminOnly},'../services/emailService.js':empty
});
async function call(route,query={}) {const res={statusCode:200,status(n){this.statusCode=n;return this;},json(data){this.data=data;return this;}};await handlers['GET '+route].at(-1)({query},res);return res;}
(async()=>{
 assert.equal(handlers['GET /users'][0],protect);assert.equal(handlers['GET /users'][1],adminOnly);
 let r=await call('/users',{page:'2',pageSize:'20',q:'last',stream:'Bio'});
 assert.equal(r.data.pagination.total,45);assert.equal(seen.skip,20);assert.equal(seen.limit,20);
 assert.equal(seen.sort._id,-1);assert.equal(seen.filter.stream,'Bio');assert.equal(seen.filter.$or[0].name.test('Last student'),true);
 assert.match(seen.select,/-resetPasswordToken/);assert.equal(r.data.users[0].accountVerified,true);
 total=20;r=await call('/users',{page:'3'});assert.equal(seen.skip,0);assert.equal(r.data.pagination.page,1);
 r=await call('/users',{page:'-1'});assert.equal(r.statusCode,400);
 const paper={_id:'p-21',title:'Physics',questionCount:4,type:'MCQ',size:100,streams:['Maths'],year:2026};
 const paperModel={countDocuments:async f=>{seen.filter=f;return 45;},aggregate:async p=>{pipeline=p;return [paper];},distinct:async field=>field==='year'?[2020,2026]:['Physics']};
 const multer=()=>({single:()=>()=>{}});multer.memoryStorage=()=>({});
 compile('routes/pastPaperRoutes.ts',{
   express:{Router:()=>router},multer,'../services/pagination.js':paging,
   '../models/PastPaper.js':paperModel,'../models/PaperAsset.js':empty,'../services/paperAssets.js':empty,
   '../services/pdfDelivery.js':empty,'../config/cloudinary.js':empty,'../middleware/authMiddleware.js':{protect,adminOnly}
 });
 r=await call('/',{page:'2',pageSize:'10',subject:'Physics',syllabus:'current',stream:'Maths',year:'2020-2026'});
 assert.equal(r.data.pagination.totalPages,5);assert.equal(pipeline.find(p=>p.$skip!==undefined).$skip,10);
 assert.equal(pipeline.find(p=>p.$limit).$limit,10);assert.equal(pipeline[1].$sort._id,-1);
 assert.equal(seen.filter.subject,'Physics');assert.equal(seen.filter.$and[0].$or[0].streams,'Maths');
 assert.equal(r.data.papers[0].questionCount,4);assert.equal(r.data.papers[0].quizReady,true);
 assert.equal(pipeline.at(-1).$project.quizQuestions,undefined);assert.ok(pipeline.at(-1).$project.questionCount);
 assert.equal((await call('/filters')).data.years[0],2026);
 r=await call('/',{pageSize:'0'});assert.equal(r.statusCode,400);
 compile('routes/courseRoutes.ts',{
   express:{Router:()=>router},mongoose:{},multer:Object.assign(()=>({fields:()=>()=>{}}),{memoryStorage:()=>({})}),
   '../services/pagination.js':paging,'../models/Course.js':userModel,'../models/CourseProgress.js':empty,'../models/PastPaper.js':empty,
   '../services/pdfStorage.js':empty,'../services/courseLearning.js':empty,'../middleware/authMiddleware.js':{protect,adminOnly}
 });
 total=45;r=await call('/admin/list',{page:'2',status:'draft',subject:'Physics',q:'waves'});
 assert.equal(handlers['GET /admin/list'][0],protect);assert.equal(handlers['GET /admin/list'][1],adminOnly);
 assert.equal(seen.skip,20);assert.equal(seen.filter.status,'draft');assert.equal(seen.sort._id,1);
 assert.equal(r.data.pagination.totalPages,3);
 console.log('PASS: parameter bounds, literal search, full-collection filters, page clamping, query limits, deterministic sorts, safe paper projections, and admin guards.');
})().catch(e=>{console.error(e);process.exitCode=1;});

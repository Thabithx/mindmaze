const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');

const ts=require('typescript');
const base=path.resolve(__dirname,'../..');
function compile(file,mocks={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(base,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports,require:n=>mocks[n]||require(n),URL,console,Buffer});return exports;}
const learning=compile('server/src/services/courseLearning.ts');
const body={title:'Cell structure',description:'Learn organelles',subject:'Biology',stream:'Bio',topic:'Cell Biology',status:'published',quizJson:JSON.stringify([{questionText:'Which organelle?',options:['Nucleus','Ribosome'],correctOptionIndex:0,explanation:'The nucleus stores DNA.'}]),videosJson:'[]'};
assert.equal(learning.validateLesson(body).estimatedMinutes,15);
assert.throws(()=>learning.validateLesson({...body,videosJson:JSON.stringify([{title:'Bad',url:'javascript:alert(1)'}])}));
assert.throws(()=>learning.validateLesson({...body,estimatedMinutes:-3}));
assert.throws(()=>learning.validateLesson({...body,quizJson:JSON.stringify([{questionText:'Q',options:['a','b'],correctOptionIndex:3}])}));
const quiz=JSON.parse(body.quizJson);
assert.equal(learning.gradeLesson(quiz,[0]).score,1);assert.equal(learning.gradeLesson(quiz,[1]).score,0);assert.throws(()=>learning.gradeLesson(quiz,[]));assert.throws(()=>learning.gradeLesson(quiz,[5]));
const routes={};const router={param(){},get(p,...h){routes['GET '+p]=h;},put(p,...h){routes['PUT '+p]=h;},post(p,...h){routes['POST '+p]=h;},delete(p,...h){routes['DELETE '+p]=h;}};
const guard=()=>{},admin=()=>{};let lastFilter,progressFilter,updated,created,removed=[];
const existing={_id:'abc',title:'Legacy lesson',description:'Existing content',subject:'Biology',stream:'Bio',quiz,videos:[],resources:[],relatedPaperIds:[],pdfUrl:'https://example.com/old.pdf',pdfPublicId:'old',pdfFileName:'Notes.pdf'};
const courseModel={findOne:async f=>{lastFilter=f;return existing;},exists:async f=>{lastFilter=f;return true;},findById:async()=>existing,findOneAndUpdate:async(f,u)=>{updated=u;return {...existing,...u.$set,revision:1};},create:async d=>{created=d;return {...d,_id:'new'};},aggregate:async()=>[{...existing,quizCount:1}]};
const progressModel={findOneAndUpdate:async(f,u)=>{progressFilter=f;return {course:f.course,...u.$set};}};
const storage={savePdf:async f=>({pdfPublicId:f.originalname,pdfFileName:f.originalname,pdfProvider:'local'}),removePdf:async r=>removed.push(r.pdfPublicId),downloadPdf:async()=>{}};
compile('server/src/routes/courseRoutes.ts',{'express':{Router:()=>router},mongoose:{isValidObjectId:()=>true},multer:Object.assign(()=>({fields:()=>guard}),{memoryStorage:()=>({})}),'../models/Course.js':courseModel,'../models/CourseProgress.js':progressModel,'../models/PastPaper.js':{find:()=>({select:()=>({lean:async()=>[]})})},'../middleware/authMiddleware.js':{protect:guard,adminOnly:admin},'../services/pdfStorage.js':storage,'../services/courseLearning.js':learning});
async function call(method,route,request={}){let status=200,data;await routes[method+' '+route].at(-1)({params:{id:'abc'},body:{},query:{},user:{_id:'student-a'},...request},{status(s){status=s;return this;},json(d){data=d;}});return {status,data};}
(async()=>{
 let r=await call('GET','/:id');assert.equal(r.data.course.topic,'General');assert.equal(r.data.course.resources[0].id,'legacy');assert.equal(r.data.course.quiz[0].correctOptionIndex,undefined);assert.equal(r.data.course.quiz[0].explanation,undefined);assert.equal(lastFilter.status.$ne,'draft');
 r=await call('GET','/');assert.equal(r.data.courses[0].quiz,undefined);assert.equal(r.data.courses[0].quizCount,1);
 r=await call('PUT','/:id/progress',{body:{completed:true}});assert.equal(progressFilter.user,'student-a');assert.equal(r.data.progress.completed,true);assert.equal(lastFilter.status.$ne,'draft');
 r=await call('PUT','/:id/progress',{body:{completed:'yes'}});assert.equal(r.status,400);
 r=await call('POST','/:id/quiz',{body:{answers:[1],revision:0}});assert.equal(r.data.score,0);assert.equal(r.data.progress.needsRevision,true);
 r=await call('POST','/:id/quiz',{body:{answers:[0],revision:1}});assert.equal(r.status,409);
 r=await call('POST','/',{body,files:{pdfFiles:[{buffer:Buffer.from('%PDF-1'),originalname:'one.pdf',size:6},{buffer:Buffer.from('%PDF-2'),originalname:'two.pdf',size:6}]}});assert.equal(r.status,201);assert.equal(created.resources.length,2);assert.equal(created.createdBy,'student-a');
 r=await call('PUT','/:id',{body:{...body,revision:0,keepResourceIds:'["legacy"]'}});assert.equal(r.status,200);assert.equal(updated.$set.pdfPublicId,undefined);assert.equal(updated.$inc.revision,1);
 r=await call('PUT','/:id',{body:{...body,revision:3}});assert.equal(r.status,409);
 assert.equal(routes['GET /admin/list'][0],guard);assert.equal(routes['GET /admin/list'][1],admin);assert.equal(routes['POST /'][1],admin);assert.equal(routes['PUT /:id'][1],admin);assert.equal(routes['DELETE /:id'][1],admin);
 const media=compile('client/src/components/courses/learning.ts');assert.equal(media.youtubeEmbed('https://youtu.be/dQw4w9WgXcQ'),'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');assert.equal(media.youtubeEmbed('https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ'),null);
 console.log('PASS: validation, grading, answer privacy, draft filters, per-user progress, stale quiz/edit protection, multiple PDFs, legacy content, admin guards, safe video links.');
})();


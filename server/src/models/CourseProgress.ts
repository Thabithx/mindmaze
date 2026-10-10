import mongoose, {Schema} from 'mongoose';

const schema = new Schema({
  user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
  course: {type: Schema.Types.ObjectId, ref: 'Course', required: true},
  completed: {type: Boolean, default: false},
  completedBlocks: {type: [String], default: []},
  lastOpenedAt: {type: Date, default: Date.now},
  quizScore: {type: Number, default: null},
  quizTotal: {type: Number, default: 0},
  needsRevision: {type: Boolean, default: false},
}, {timestamps: true});
schema.index({user: 1, course: 1}, {unique: true});
export default mongoose.model('CourseProgress', schema);

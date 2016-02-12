import includesHandler from './query/includes-handler';
import streamHandler from './query/stream-handler';
import queryHandler from './query/query-handler';

export default includesHandler(streamHandler(queryHandler));

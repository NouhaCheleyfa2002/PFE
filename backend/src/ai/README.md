# AI Module - DeepSeek Integration

## Overview

This module provides AI-powered features using DeepSeek API, including chat, summarization, translation, and email generation.

## Structure

```
ai/
├── ai.module.ts          # Module definition
├── ai.controller.ts      # REST API endpoints
├── ai.service.ts         # DeepSeek API integration
├── dto/
│   └── chat.dto.ts       # Request validation DTOs
└── README.md             # This file
```

## Features

✅ **Chat**: General-purpose AI conversation  
✅ **Summarize**: Text summarization  
✅ **Translate**: Multi-language translation  
✅ **Generate Email**: Professional email generation  
✅ **JWT Authentication**: All endpoints protected  
✅ **Error Handling**: Comprehensive error management  
✅ **Input Validation**: Request validation with class-validator  
✅ **Configurable**: Environment-based configuration  

## Quick Start

1. Add API key to `.env`:
   ```env
   DEEPSEEK_API_KEY=your-key-here
   ```

2. Restart backend:
   ```bash
   npm run start:dev
   ```

3. Test endpoint:
   ```bash
   POST /ai/chat
   {
     "prompt": "Hello AI"
   }
   ```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/chat` | Chat with AI |
| POST | `/ai/summarize` | Summarize text |
| POST | `/ai/translate` | Translate text |
| POST | `/ai/generate-email` | Generate email |
| GET | `/ai/status` | Check configuration |

## Documentation

- **Quick Start**: `../../AI_QUICK_START.md`
- **Full Documentation**: `../../AI_MODULE_DOCUMENTATION.md`
- **Postman Collection**: `../../DeepSeek_AI_Postman_Collection.json`

## Usage in Other Modules

```typescript
import { AiModule } from '../ai/ai.module';
import { AiService } from '../ai/ai.service';

@Module({
  imports: [AiModule],
})
export class YourModule {}

@Injectable()
export class YourService {
  constructor(private readonly aiService: AiService) {}
  
  async example() {
    return await this.aiService.chat('Hello');
  }
}
```

## Configuration

Environment variables:
- `DEEPSEEK_API_KEY` - Your DeepSeek API key (required)
- `DEEPSEEK_API_URL` - API base URL (default: https://api.deepseek.com)
- `DEEPSEEK_MODEL` - Model name (default: deepseek-chat)

## Security

- All endpoints require JWT authentication
- API key stored in environment variables
- Input validation on all requests
- Rate limiting handled by DeepSeek API
- 60-second timeout on requests

## Error Handling

The service handles:
- Invalid API keys (401)
- Rate limiting (429)
- Bad requests (400)
- Network errors (500)
- Empty prompts (400)
- Service unavailable (503)

## Testing

```bash
# Check status
curl http://localhost:3001/ai/status \
  -H "Authorization: Bearer TOKEN"

# Test chat
curl -X POST http://localhost:3001/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"prompt":"Test"}'
```

## Performance

- Timeout: 60 seconds
- Max tokens: 2000 per request
- Temperature: 0.7
- Model: deepseek-chat

## Future Enhancements

- [ ] Streaming responses
- [ ] Conversation history
- [ ] Token usage tracking
- [ ] Response caching
- [ ] Multiple model support
- [ ] Image analysis

## Support

For issues:
1. Check backend logs
2. Verify API key configuration
3. Test with `/ai/status` endpoint
4. Review DeepSeek API documentation

---

**Module Status**: ✅ Production Ready  
**Last Updated**: 2026-05-22  
**Version**: 1.0.0

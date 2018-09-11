import { NgxChatModule } from './ngx-chat.module';

it('should import all other classes and therefore allow us to see files without test coverage', () => {
    expect(NgxChatModule).toBeDefined();
});

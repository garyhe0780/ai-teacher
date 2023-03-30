import { OPENAI_KEY } from '$env/static/private';
import { oneLine, stripIndent } from 'common-tags';
import type { RequestHandler } from './$types';
import type { CreateCompletionRequest } from 'openai';
import { error, type Config } from '@sveltejs/kit';

export const config: Config = {
	runtime: 'edge'
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		if (!OPENAI_KEY) {
			throw new Error('OPENAI_KEY env var not set');
		}

		const requestData = await request.json();

		if (!requestData) {
			throw new Error('Request data missing');
		}

		const { context } = requestData;

		if (!context) {
			throw new Error('No context provided');
		}

		const generatedPrompt = stripIndent`
        ${oneLine`I want you to act as a spoken English teacher and improver. I will speak to you in English and you will reply to me in English to practice my spoken English. I want you to keep your reply neat, limiting the reply to 100 words. I want you to strictly correct my grammar mistakes, typos, and factual errors. I want you to ask me a question in your reply. Now let's start practicing, you could ask me a question first. Remember, I want you to strictly correct my grammar mistakes, typos, and factual errors.`}

        Context:"""${context.trim().replace('\n', '')}"""

        Answer:
        `;

		const completionOpts: CreateCompletionRequest = {
			model: 'text-davinci-003',
			prompt: generatedPrompt,
			max_tokens: 1000,
			temperature: 0.9,
			stream: true
		};

		const response = await fetch('https://api.openai.com/v1/completions', {
			headers: {
				Authorization: `Bearer ${OPENAI_KEY}`,
				'Content-Type': 'application/json'
			},
			method: 'POST',
			body: JSON.stringify(completionOpts)
		});

		if (!response.ok) {
			const err = await response.json();
			console.error(err);
			throw new Error('Failed to create completion', err);
		}

		return new Response(response.body, {
			headers: {
				'Content-Type': 'text/event-stream'
			}
		});
	} catch (err) {
		console.error(err);
		throw error(500, 'An error occurred');
	}
};

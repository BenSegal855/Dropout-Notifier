import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import z from 'zod';
import { DROPOUT_YELLOW } from './constants';
import { ContainerBuilder, SectionBuilder } from 'discord.js';

const AUTH_URL = 'https://www.dropout.tv/browse' as const;
const TOKEN_RE = /window\.TOKEN = "(?<token>.*)";/;

const SHOW_PARSER = z.object({
	items: z.array(z.object({
		id: z.int(),
		entity_type: z.string(),
		entity: z.object({
			title: z.string(),
			description: z.string(),
			page_url: z.url(),
			slug: z.string(),
			thumbnails: z.object({ '16_9': z.object({ large: z.string() }) }),
			metadata: z.object({
				tags: z.string().array(),
				release_dates: z.object({ date: z.iso.date()}).array(),
				season: z.object({
					name: z.string(),
					number: z.int()
				}),
				series: z.object({
					name: z.string(),
					id: z.string()
				})
			})
		})
	}).transform(obj => ({
		id: obj.id,
		title: obj.entity.title,
		releaseDate: obj.entity.metadata.release_dates[0].date,
		url: obj.entity.page_url,
		description: obj.entity.description,
		thumbnail: obj.entity.thumbnails['16_9'].large,
		slug: obj.entity.slug,
		tags: obj.entity.metadata.tags,
		season: obj.entity.metadata.season,
		series: obj.entity.metadata.series
	})))
}).transform(({items}) => items);

const SERIES_PARSER = z.object({
	items: z.array(z.object({
		id: z.int(),
		entity_type: z.string(),
		entity: z.object({
			title: z.string(),
			description: z.string().nullable(),
			season_number: z.int(),
			page_url: z.url(),
			slug: z.string(),
			thumbnails: z.object({ '1_1': z.object({ large: z.string() }) })
		})
	}).transform(obj => ({
		id: obj.id,
		title: obj.entity.title,
		number: obj.entity.season_number,
		url: obj.entity.page_url,
		description: obj.entity.description,
		thumbnail: obj.entity.thumbnails['1_1'].large,
		slug: obj.entity.slug
	})))
}).transform(({items}) => items);

export class Dropout {
	private token: string = '';
	private expires: number = 0;
	private collectionsAPI = axios.create({ baseURL: 'https://api.vhx.com/v2/sites/36348/collections/' });

	private static _instance: Dropout;
    private constructor() {}
    public static get API()
    {
        return this._instance || (this._instance = new this());
    }

	private async fetchAuth() {
		const { data } = await axios.get<string>(AUTH_URL);
		
		const newToken = data.match(TOKEN_RE)?.groups?.token;
		if (!newToken) {
			throw new Error('No token found');
		}

		const decoded = jwtDecode(newToken);

		this.token = newToken;
		this.expires = decoded.exp ?? 0

		this.collectionsAPI = this.collectionsAPI.create({
			headers: {
				Authorization: `Bearer ${this.token}`
			}
		})
	}

	private async makeRequest<T>(uri: string, params: Record<string, unknown>) {
		if (Date.now() > this.expires) {
			await this.fetchAuth();
		}

		return this.collectionsAPI.get<T>(uri, { params });
	}

	public async getLatestVideos(entries = 1): Promise<Video[]> {
		const { data } = await this.makeRequest<unknown>('129054/items', {
			per_page: entries
		});

		return SHOW_PARSER.parse(data);
	}

	public async getSeries(id: string): Promise<Season[]> {
		const { data } = await this.makeRequest<unknown>(`${id}/items`, {
			per_page: 100
		});

		return SERIES_PARSER.parse(data);
	}

	public async getSeason({ seriesId, seasonNumber }: { seriesId: string, seasonNumber: number }): Promise<Season> {
		const series = await this.getSeries(seriesId);
		const seasonMap = new Map(series.map(season => [season.number, season]));
		const season = seasonMap.get(seasonNumber);

		if (!season) {
			throw new Error(`No season ${seasonNumber} found in series ${seriesId}`)
		}
		return season;
	}

	public static buildComponents(video: Video, season: Season): (ContainerBuilder|SectionBuilder)[] {
		const seriesSection = new SectionBuilder()
			.addTextDisplayComponents(text => text.setContent(`New episode of ${video.series.name}: ${season.title}`))
			.setThumbnailAccessory(thumbnail => thumbnail.setURL(season.thumbnail))
		
		const videoContainer = new ContainerBuilder()
			.setAccentColor(DROPOUT_YELLOW)
			.addTextDisplayComponents(text => text.setContent(`## [${video.title}](${video.url})`))
			.addMediaGalleryComponents(gallery => gallery.addItems(item => item.setURL(video.thumbnail)))
			.addSeparatorComponents(separator => separator)
			.addTextDisplayComponents(
				text => text.setContent(video.description),
				text => text.setContent(`-# ${video.slug} | ${video.releaseDate}`)
			)
		return [seriesSection, videoContainer];
	}
}

export type Video = z.infer<typeof SHOW_PARSER.in.shape.items.element>;
export type Season = z.infer<typeof SERIES_PARSER.in.shape.items.element>;

import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  OnChanges,
  OnInit,
  SecurityContext,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Message, MessageService } from 'primeng/api';
import { MovieTmdbService } from 'src/app/services/tmdb-service';
import ColorThief from 'colorthief';
import { Client, CreditsDto, MovieDto } from 'src/app/services/movie-service';
@Component({
  selector: 'app-movie-details',
  templateUrl: './movie-details.component.html',
  styleUrls: ['./movie-details.component.scss'],
})
export class MovieDetailsComponent implements OnInit {
  movieId: string = '';
  movieDetails: any;
  backdrops: any = [];
  baseUrl = 'https://www.youtube.com/embed/';
  autoplay = '?rel=0;&autoplay=1&mute=0';
  videos: any = [];
  responsiveOptions: any[] = [];
  message: Message[] = [];
  mp3File: string = '';
  backgroundPosterColors: string[] = [];
  fromColor: string = '';
  toColor: string = '';
  addMovie: MovieDto = {};
  credits: CreditsDto[] = [];
  movieCast: any[] = [];
  constructor(
    private route: ActivatedRoute,
    private movieTmdbService: MovieTmdbService,
    private sanitizer: DomSanitizer,
    private cdRef: ChangeDetectorRef,
    private client: Client,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.message = [
      {
        severity: 'warn',
        summary: 'Waning',
        detail: 'This Movie is not in your Library',
      },
    ];
    this.responsiveOptions = [
      {
        breakpoint: '1024px',
        numVisible: 5,
      },
      {
        breakpoint: '768px',
        numVisible: 3,
      },
      {
        breakpoint: '560px',
        numVisible: 1,
      },
    ];
    this.route.params.subscribe((params) => {
      this.movieId = params['id'];
    });
    this.movieTmdbService.getMovie(this.movieId).subscribe((result) => {
      this.movieDetails = result;
      console.log(this.movieDetails);
      this.client
      .apiOpenAIUserChatGptAudio(this.movieDetails.overview)
      .subscribe((result) => {
        if (result) {
          const blob = new Blob([result.data], {
            type: 'audio/mp3',
          });
          this.mp3File = URL.createObjectURL(blob);
        }
      });
    });
    this.movieTmdbService
      .getBackdropsImages(this.movieId)
      .subscribe((result: any) => {
        if (result) {
          this.backdrops = result.backdrops;
          console.log(this.backdrops);
          this.getColorPalette();
        }
      });

    this.movieTmdbService
      .getMovieVideos(this.movieId)
      .subscribe((result: any) => {
        console.log(result);
        result.results.forEach((element: { key: string }, index: any) => {
          this.videos.push(this.baseUrl + element.key);
        });
        console.log(this.videos);
      });

    this.movieTmdbService.getPersonCast(this.movieId).subscribe((result) => {
      if (result) {
        this.movieCast = result.cast;
        console.log(this.movieCast);
      }
    });
  }

  getColorPalette() {
    setTimeout(() => {
      const img = document.getElementById('imgPoster') as HTMLImageElement;
      if (img) {
        this.loadImage(img.src)
          .then(() => {
            this.extractColorPalette(img);
          })
          .catch((error) => {
            console.error('Image loading failed:', error);
          });
      }
    }, 500);
  }
  loadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });
  }
  private extractColorPalette(img: HTMLImageElement) {
    const colorThief = new ColorThief();
    const palette = colorThief.getPalette(img, 2);
    palette.forEach((color: number[]) => {
      this.getHexValues(color[0], color[1], color[2]);
    });
    this.fromColor = this.backgroundPosterColors[0];
    this.toColor = this.backgroundPosterColors[1];
    console.log('from color' + this.fromColor);
    console.log('to color' + this.toColor);
  }

  public getHexValues(r: number, g: number, b: number) {
    const hex =
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('');
    if (hex != null) {
      this.backgroundPosterColors.push(hex);
    }
    console.log(this.backgroundPosterColors);
  }

  addMovieToLibrary() {
    // this.credits.push(this.movieCast);
    this.credits = this.movieCast.map((castItem) => {
      const credit: CreditsDto = {
        id: castItem.id,
        adult: castItem.adult,
        name: castItem.name,
        originalName: castItem.original_name,
        popularity: castItem.popularity,
        character: castItem.character,
        profilePath: castItem.profile_path || '',
      };

      return credit;
    });

    this.addMovie = {
      tmdbId: this.movieDetails.id,
      adult: this.movieDetails.adult,
      backdropPath: this.movieDetails.backdrop_path,
      originalLanguage: this.movieDetails.original_language,
      originalTitle: this.movieDetails.original_title,
      overview: this.movieDetails.overview,
      title: this.movieDetails.title,
      popularity: this.movieDetails.popularity,
      voteAverage: this.movieDetails.vote_average,
      voteCount: this.movieDetails.vote_count,
      posterPath: this.movieDetails.poster_path,
      releaseDate: this.movieDetails.release_date,
      category: this.movieDetails.genres[1].name,
      credits: this.credits,
    };

    this.client.apiMoviesAddMovie(this.addMovie).subscribe((result) => {
      if (result) {
        this.messageService.add({
          severity: 'info',
          summary: 'Info',
          detail: `${result} movie is added succesfully`,
        });
      }
    });
  }
}

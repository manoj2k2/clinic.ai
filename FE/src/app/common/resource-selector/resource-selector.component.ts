// src/app/common/resource-selector/resource-selector.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FhirService } from '../../services/fhir.service';
import { debounceTime, distinctUntilChanged, switchMap, map } from 'rxjs/operators';
import { Subject } from 'rxjs';

interface SimpleResource {
  id: string;          // e.g. "123"
  display: string;     // human‑readable label
}

@Component({
  selector: 'app-resource-selector',
  templateUrl: './resource-selector.component.html',
  styleUrls: ['./resource-selector.component.css']
})
export class ResourceSelectorComponent implements OnInit {
 
  /** FHIR resource type to query, e.g. 'Practitioner' */
  @Input() resourceType!: string;

  /** Placeholder for the search input */
  @Input() placeholder = 'Search...';

  /** Emits the selected resource id (without the type prefix) */
  @Output() selectedId = new EventEmitter<string>();

  /** Results shown in the dropdown */
  results: SimpleResource[] = [];

  /** Current term shown in the input box (used for display) */
  searchTerm = '';

  /** Highlighted index for keyboard navigation */
  highlightedIndex = -1;

  /** Internal subject for debounced searching */
  private searchTerm$ = new Subject<string>();

  /** Loading indicator */
  loading = false;

  constructor(private fhir: FhirService) {}

  ngOnInit(): void {
    this.searchTerm$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => this.searchResources(term))
      )
      .subscribe(resources => {
        this.results = resources;
        this.loading = false;
      });
  }

  /** Called on each keystroke */
  onSearch(term: string): void {
    this.searchTerm = term;
    this.loading = true;
    this.searchTerm$.next(term);
    this.highlightedIndex = -1;
  }

  /** Perform the FHIR request and map the bundle to SimpleResource[] */
  private searchResources(term: string) {
    const query = term ? `?name=${term}&_count=20` : '?_count=20';
    const url = `/fhir/${this.resourceType}${query}`;
    return this.fhir.http.get<any>(url).pipe(
      map((bundle: any) => {
        const entries = bundle.entry || [];
        return entries.map((e: any) => {
          const r = e.resource;
          let display = '';
          if(this.resourceType === 'Practitioner') {
            const name = r.name?.[0];
            display = name ? `${name.given?.join(' ') || ''} ${name.family || ''}`.trim() : '';
          }
          if (this.resourceType === 'Organization') {
            display = r.name || '';
          }
          return { id: r.id, display: display ?? r.id } as SimpleResource;
        });
      })
    );
  }

  /** When a result is clicked */
  select(resource: SimpleResource): void {
    this.searchTerm = resource.display; // show chosen label in the input
    this.selectedId.emit(resource.id);
    this.results = [];
    this.highlightedIndex = -1;
  }

  clear(): void {
    this.searchTerm = '';
    this.results = [];
    this.selectedId.emit('');
    this.highlightedIndex = -1;
  }

  onKeyDown(e: KeyboardEvent): void {
    if (!this.results || this.results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.highlightedIndex = Math.min(this.results.length - 1, this.highlightedIndex + 1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.highlightedIndex = Math.max(0, this.highlightedIndex - 1);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (this.highlightedIndex >= 0 && this.highlightedIndex < this.results.length) {
        this.select(this.results[this.highlightedIndex]);
      }
    }
    if (e.key === 'Escape') {
      this.clear();
    }
  }
}
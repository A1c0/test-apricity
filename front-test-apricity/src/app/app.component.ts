import {Component, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private title = 'front-test-apricity';
  private categories;
  private tableData;
  private nonDisplayedValues;
  private nonDisplayedLines;

  constructor(private http: HttpClient) {
    this.categories = [];
    this.tableData = [];
    this.nonDisplayedValues = 0;
    this.nonDisplayedLines = 0;
  }

  async ngOnInit() {
    await this.getCategories();
  }

  private async getCategories() {
    const res = this.http.get('http://0.0.0.0:3000/getVariableNames');
    this.categories = await new Promise((resolve) => {
      res.subscribe(resolve);
    });
  }

  private async onSelectCategory(category: string) {
    const res = this.http.post('http://0.0.0.0:3000/getMetricFromColumn', {column : category, max: 100});
    const metrics: any = await new Promise((resolve) => {
      res.subscribe(resolve);
    });
    this.tableData = metrics.displayData;
    this.nonDisplayedValues = metrics.nonDisplayData.nonDisplayedValues;
    this.nonDisplayedLines = metrics.nonDisplayData.nonDisplayedLines;
  }
}

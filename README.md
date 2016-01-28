[![Downloads](https://img.shields.io/pypi/dw/django-maced.svg)](https://pypi.python.org/pypi/django-maced)
[![Version](https://img.shields.io/pypi/v/django-maced.svg)](https://pypi.python.org/pypi/django-maced)
[![License](https://img.shields.io/pypi/l/django-maced.svg)](https://pypi.python.org/pypi/django-maced)
[![Python](https://img.shields.io/pypi/pyversions/django-maced.svg)](https://pypi.python.org/pypi/django-maced)

# Django-Maced
Django app designed to help with easy database record manipulation/creation on the frontend. It is called Maced for Merge Add Clone Edit Delete.

# System requirements

Python 2.7 only. Requires setuptools. 
Run `python ez_setup.py` command if you do not have setuptools installed in your virtual environment.

# Installation

Install the latest release using pip:

`pip install django-maced`

Development version can installed using `pip install git+https://github.com/Macainian/Django-Maced.git`

Alternatively, you can download or clone this repo and call `pip install -e ..`

# Usage example

Must be used with a class based view. There is probably a workaround for function based views though.
The following example assumes there exists a django app named example_app with urls for this maced object (more on this 
later). There should also be a model called Example with fields of name and description. The example also assumes there 
is a url named login that goes to the login page.

In the view do:
```python
from django_maced.utils.maced_creator import add_item_to_context, finalize_context_for_items
from website.apps.example_app.models import Example


class SomeView(TemplateView):
    template_name = "blah/something.html"
    
    def get_context_data(self, **kwargs):
        context = super(self.__class__, self).get_context_data(**kwargs)
        
        example_field_list = [
            {"name": "name"},
            {"name": "description"},
        ]
        
        add_item_to_context(
            context=context, item_name="example", item_html_name="Example", item_class=Example,
            item_name_field_name="name", field_list=example_field_list, name_of_app_with_urls="example_app"
            current_item_id=0
        )
        
        finalize_context_for_items(context, login_url=reverse("login"))
        
        return context
```

In the urls for example_app:
```python
from django.conf.urls import url

from django_maced.views.function_based.item_action_views import add_item_view, \
    edit_item_view, merge_item_view, delete_item_view, get_item_view

from website.apps.example_app.models import Example

urlpatterns = [
    url(r"^add_example/$", add_item_view, name="example_app.add_example",
        kwargs={"item_class": Example}),
    url(r"^edit_example/(?P<item_id>\d+)/$", edit_item_view, name="example_app.edit_example",
        kwargs={"item_class": Example}),
    url(r"^merge_example/(?P<item1_id>\d+)/(?P<item2_id>\d+)/$", merge_item_view, name="example_app.merge_example",
        kwargs={"item_class": Example}),
    url(r"^delete_example/(?P<item_id>\d+)/$", delete_item_view, name="example_app.delete_example",
        kwargs={"item_class": Example}),
    url(r"^get_example/(?P<item_id>\d+)/$", get_item_view, name="example_app.get_example",
        kwargs={"item_class": Example}),
]
```

In the template for "something.html" at the top:
```html
<script>
    var maced_data = {{ maced_data|safe }};
</script>

<script src="{% static 'django_maced/js/maced.js' %}"></script>
```

In the template where you want the maced object to appear:
```html
    <table class="table table-striped">
        {{ example_item|safe }}
    </table>

    {{ maced_modals|safe }}
```

Be sure that the modals are outside of any tables.

And that's it. Just that small amount of code and you have access to merging, adding, cloning, editing, and deleting 
records from you database with an easy-to-use dropdown/button/popup system. Note that many of the names from above were 
actually specific names that must be followed. Also note that there are some assumptions made about these items such as
the name field on a model being unique.

# Special Thanks
Xaralis: Wrote the original version of merge_model_objects() found here: https://djangosnippets.org/snippets/2283/
Tyomklz: Made the logos for django-maced
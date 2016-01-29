[![Downloads](https://img.shields.io/pypi/dw/django-maced.svg)](https://pypi.python.org/pypi/django-maced)
[![Version](https://img.shields.io/pypi/v/django-maced.svg)](https://pypi.python.org/pypi/django-maced)
[![License](https://img.shields.io/pypi/l/django-maced.svg)](https://pypi.python.org/pypi/django-maced)
[![Python](https://img.shields.io/pypi/pyversions/django-maced.svg)](https://pypi.python.org/pypi/django-maced)

<img src=maced_green.png width=300 />

Django app designed to help with easy database record manipulation/creation on the frontend. It is called MACED for Merge Add Clone Edit Delete.
If you want to report any bugs, you can use the github issue tracker. If you have comments, please email me at khostetl@nd.edu.

# Requirements

* Python 2.7 only. Requires setuptools. Run `python ez_setup.py` command if you do not have setuptools installed in your virtual environment.
* Django >=1.8 (probably works with some lower ones too)
* django-bootstrap3 >= ? 
* Bootstrap 3 (though eventually I will upgrade to using 4)

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
from maced.utils.maced_creator import add_item_to_context, finalize_context_for_items
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
            context=context, item_name="example", item_html_name="Example", item_model=Example,
            item_name_field_name="name", field_list=example_field_list, name_of_app_with_urls="example_app"
            current_item_id=0
        )
        
        finalize_context_for_items(context, login_url=reverse("login"))
        
        return context
```

In the urls for example_app:
```python
from django.conf.urls import url

from maced.views.function_based.item_action_views import add_item_view, \
    edit_item_view, merge_item_view, delete_item_view, get_item_view

from website.apps.example_app.models import Example

urlpatterns = [
    url(r"^add_example/$", add_item_view, name="example_app.add_example",
        kwargs={"item_model": Example}),
    url(r"^edit_example/(?P<item_id>\d+)/$", edit_item_view, name="example_app.edit_example",
        kwargs={"item_model": Example}),
    url(r"^merge_example/(?P<item1_id>\d+)/(?P<item2_id>\d+)/$", merge_item_view, name="example_app.merge_example",
        kwargs={"item_model": Example}),
    url(r"^delete_example/(?P<item_id>\d+)/$", delete_item_view, name="example_app.delete_example",
        kwargs={"item_model": Example}),
    url(r"^get_example/(?P<item_id>\d+)/$", get_item_view, name="example_app.get_example",
        kwargs={"item_model": Example}),
]
```

In the template for "something.html" at the top:
```html
<script>
    var maced_data = {{ maced_data|safe }};
</script>

<script src="{% static 'maced/js/maced.js' %}"></script>
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

# Special Notes and Tips

## Example 1 (Handling cases when you may or may not have an object on the page to pull previous info from)
So first let's look at the HARD way to handle cases where we have an object that we don't know if it is None or not.

```python
example_field_list = [
    {"name": "name"}
]

if example_parent is None:
    example_id = 0
else:
    example_id = get_current_item_id(example_parent, "example")  # This function comes with django-maced

add_item_to_context(
    context=context, item_name="example", item_html_name="Example", item_model=Example,
    item_name_field_name="name", field_list=example_field_list, name_of_app_with_urls="example_app",
    current_item_id=example_id
)

finalize_context_for_items(context, login_url=reverse("login"))
```

Now that is nice and all, but it can be bulky and tedious for a page where you have many items, because you would have
to check for None each time so that you could send it properly to get_current_item_id(). Well it turns out that
get_current_item_id() actually allows you to pass a None object and will default to 0 if it is None. So just pass it in
as is. Let's try that:

```python
example_field_list = [
    {"name": "name"}
]
add_item_to_context(
    context=context, item_name="example", item_html_name="Example", item_model=Example,
    item_name_field_name="name", field_list=example_field_list, name_of_app_with_urls="example_app",
    current_item_id=get_current_item_id(example_parent, "example")
)

finalize_context_for_items(context, login_url=reverse("login"))
```

There much better. Now let's move on to making a separate function for when you have several items. I usually make a
separate function called add_maced_items() and pass context and the parent_object (could be None). This is especially
helpful if you have a CreateView and an EditView since you will likely be using all of the same maced items. CreateView
will pass None, but EditView will pass an instance; both will be handled. Let's look at Example 2.

## Example 2 (making a separate function to keep things cleaner in your get_context_data() and making items in a concise way)

```python
def add_maced_items(context, example_parent):
    app_name = "example_app"

    item_name = "example"
    field_list = [
        {"name": "name"}
    ]
    add_item_to_context(
        context=context, item_name=item_name, item_html_name="Example", item_model=Example,
        item_name_field_name="name", field_list=field_list, name_of_app_with_urls=app_name,
        current_item_id=get_current_item_id(example_parent, item_name)
    )

    item_name = "example2"
    field_list = [
        {"name": "name"}
        {"color": "color"}
    ]
    add_item_to_context(
        context=context, item_name=item_name, item_html_name="Example2", item_model=Example2,
        item_name_field_name="name", field_list=field_list, name_of_app_with_urls=app_name,
        current_item_id=get_current_item_id(example_parent, item_name)
    )

    finalize_context_for_items(context, login_url=reverse("login"))
```

I know that this is pretty basic concepts in this example, but if you have a ton of items, doing it this way will speed
up the process a lot. Copy-Paste-Edit. The less you have to edit the better right? :)

## Example 3 (selects for other objects)

Next let's look at getting select options for selects of type "object" so we can get connected with other objects in the
database. For this example let's assume we have a model called House which has a field called door that is a model
called Door which has a field called handle that is a model called Handle.

```python
def add_maced_items(context, house):
    app_name = "building_app"

    item_name = "door"
    field_list = [
        {"name": "name"},
        {"name": "handle", "type": "select", "select-type": "object",
         "options": [(handle.id, handle.name) for handle in Handle.objects.all()]},
    ]
    add_item_to_context(
        context=context, item_name=item_name, item_html_name="Door", item_model=Door,
        item_name_field_name="name", field_list=field_list, name_of_app_with_urls=app_name,
        current_item_id=get_current_item_id(house, item_name)
    )

    finalize_context_for_items(context, login_url=reverse("login"))
```

Usually I would put "[(handle.id, handle.name) for handle in Handle.objects.all()]" in a function just to make it look
nicer. Lastly, we will look at model inheritance with maced items.

## Example 4 (handling models that have inheritance where you will be working from an instance of the base model but don't know if the sub-model will exist or not)

For this example we will use a model called Subject which is the base model. Then we will assume we have several models
that inherent from this model, but we will only talk about one in this example; Clergy. A clergyman belongs to a church
and thus has a denomination. So we will also use a model called Denomination. So a Clergy is a Subject that has a
Denomination, while the other sub-models do not have a Denomination. Also remember that we DON'T know if the subject we
are sending in is None or not and whether or not it is a clergyman.

With that we can now look at an example:

```python
def add_maced_items(context, subject):
    app_name = "example_app"

    item_name = "denomination"
    denomination_field_list = [
        {"name": "name"},
    ]
    try:
        denomination_id = get_current_item_id(subject.clergy, item_name)
    except AttributeError:
        denomination_id = 0
    add_item_to_context(
        context=context, item_name=item_name, item_html_name="Denomination", item_model=Denomination,
        item_name_field_name="name", field_list=denomination_field_list, name_of_app_with_urls=app_name,
        current_item_id=denomination_id
    )

    finalize_context_for_items(context, login_url=reverse("login"))
```

And that is it. Just a simple try-except on AttributeError. This will now allow you to still use get_current_item_id
while not worrying about what is None and what isn't.

# Special Thanks
* Xaralis: Wrote the original version of merge_model_objects() found here: https://djangosnippets.org/snippets/2283/
* Tyomklz: Made the logos for django-maced